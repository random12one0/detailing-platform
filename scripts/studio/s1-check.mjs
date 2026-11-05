// STUDIO S1 — "prove the wire", in a real browser, against the offline engine.
//
//   node scripts/studio/s1-check.mjs            (dev server + built preview)
//   node scripts/studio/s1-check.mjs --no-built (dev server only, faster)
//
// Starts belt-staging's offline engine (demo-backend.mjs) IN THIS PROCESS with
// the fictional Brightline seed, so the check can edit the "dashboard" between
// reloads. Starts Vite pointed at it. Never touches the real database, sends
// nothing, writes only artifacts/studio-s1/. Exits 1 on any failed proof.
//
// Proofs:
//   P1 dashboard edits (price, hidden service, hours, sale, FAQ) show after a
//      reload, with no rebuild
//   P2 the live profile validates the spec; every data-from on the page is an
//      allow-listed binding; no digit on the page sits outside a binding
//   P3 a booking made through the site reaches a recorded create-booking post,
//      and its total equals what calculate-booking says
//   P4 390 / 768 / 1440: screenshots, no console errors or warnings, no
//      horizontal overflow, 44 px phone targets, one h1; every link and button
//      outside the booking flow clicked; reduced motion leaves nothing running
//   P5 unknown slug shows not-found; /book/:slug still works (route unchanged)
//   P6 (built) the production bundle routes /site/<slug> and the same not-found
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import os from "node:os";
import path from "node:path";
import net from "node:net";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "app");
const BELT = process.env.STUDIO_BELT || "C:/Users/rando/Downloads/claude/control-room/belt-staging";
const OUT = path.join(ROOT, "artifacts/studio-s1");
const BUILT = !process.argv.includes("--no-built");
const { chromium } = createRequire(path.join(APP, "package.json"))("playwright");
const { startDemoBackend } = await import(pathToFileURL(path.join(BELT, "demo-backend.mjs")).href);
const { validateSpec, parseBinding } = await import(pathToFileURL(path.join(APP, "src/site/spec.js")).href);
const { normalizeProfile, createBookingTransport } = await import(pathToFileURL(path.join(APP, "src/book/core.js")).href);
const spec = (await import(pathToFileURL(path.join(APP, "src/site/specs/brightline.json")).href, { with: { type: "json" } })).default;

const results = [];
const record = (proof, name, pass, detail = "") => {
  results.push({ proof, name, pass: !!pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} ${proof} ${name}${detail ? ` — ${typeof detail === "string" ? detail : JSON.stringify(detail)}` : ""}`);
};
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };

function startVite(args, env) {
  const child = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), ...args],
    { cwd: APP, env: { ...process.env, ...env }, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
  let log = ""; child.stdout.on("data", (d) => { log += d; }); child.stderr.on("data", (d) => { log += d; });
  return { child, log: () => log };
}

mkdirSync(OUT, { recursive: true });
const engine = await startDemoBackend({ port: 0, seed: path.join(BELT, "fixtures/sites/brightline.seed.json"), platform: ROOT, quiet: true });
const env = { VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon" };
const vitePort = await freePort();
const dev = startVite(["--port", String(vitePort), "--strictPort", "--host", "127.0.0.1"], env);
const BASE = `http://127.0.0.1:${vitePort}`;
const SITE = `${BASE}/site/brightline`;
const browser = await chromium.launch();
const reset = () => fetch(`${engine.url}/__demo/reset`, { method: "POST", body: "{}" });
const T = () => engine.db.tables;
const ID = (n) => `00000000-0000-4000-8000-000000000${n}`;

async function open(width, height, opts = {}) {
  const context = await browser.newContext({ viewport: { width, height }, ...opts });
  const page = await context.newPage();
  const problems = [];
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  return { context, page, problems };
}
async function load(page, url = SITE) {
  const res = await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('[data-booking-step="1"], .site-msg', { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  return res;
}
const text = (page, sel) => page.locator(sel).first().innerText();

try {
  if (!(await until(() => fetch(SITE).then((r) => r.ok)))) throw new Error("vite dev server never answered:\n" + dev.log());

  // ---------------------------------------------------------------- P2 (node half)
  const api = createBookingTransport({ supabaseUrl: engine.url, anonKey: "demo-anon" });
  const live = normalizeProfile(await api.profile("brightline"));
  const v = validateSpec(spec, live);
  record("P2", "the Brightline spec validates against the live offline profile", v.ok, v.ok ? "" : v.errors);

  // ---------------------------------------------------------------- P4 three widths
  for (const [w, h] of [[390, 844], [768, 1024], [1440, 900]]) {
    const { context, page, problems } = await open(w, h);
    await load(page);
    await page.waitForTimeout(1200); // let the hero entrance finish before the full-page shot
    const shot = path.join(OUT, `site-${w}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    await page.screenshot({ path: path.join(OUT, `site-${w}-fold.png`) });
    const m = await page.evaluate(() => {
      const vw = innerWidth, out = { overflow: [], small: [], digits: [], froms: [] };
      out.scrollWidth = document.documentElement.scrollWidth;
      for (const e of document.querySelectorAll("body *")) {
        const r = e.getBoundingClientRect();
        if (r.width && (r.right > vw + 0.5 || r.left < -0.5) && !e.closest(".site-skip")) out.overflow.push(`${e.tagName}.${e.className}`);
      }
      const visible = (e) => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none"; };
      for (const e of document.querySelectorAll("a, button, input, summary, select, textarea")) {
        if (!visible(e) || e.closest(".site-skip")) continue;
        // The HIT area, not the box: the booking flow widens small toggles with a
        // negative-inset ::after (booking.css .bk-peek), and that is what a thumb presses.
        const r = e.getBoundingClientRect(), af = getComputedStyle(e, "::after");
        const grow = (v) => (af.content !== "none" && af.position === "absolute" && v.endsWith("px") ? Math.max(0, -parseFloat(v)) : 0);
        const hw = r.width + grow(af.left) + grow(af.right), hh = r.height + grow(af.top) + grow(af.bottom);
        if (vw <= 390 && (hw < 44 || hh < 44)) out.small.push(`${e.tagName} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(hw)}x${Math.round(hh)}`);
      }
      for (const el of document.querySelectorAll(".site *")) {
        if (el.closest("[data-from],script,style,svg")) continue;
        for (const n of el.childNodes) if (n.nodeType === 3 && /\d/.test(n.textContent)) out.digits.push(`${el.tagName}: ${n.textContent.trim().slice(0, 40)}`);
      }
      out.froms = [...new Set([...document.querySelectorAll("[data-from]")].map((e) => e.dataset.from))];
      out.h1 = document.querySelectorAll("h1").length;
      out.mains = document.querySelectorAll("main, [role=main]").length;
      out.sections = [...document.querySelectorAll("[data-section]")].map((e) => e.dataset.section);
      return out;
    });
    record("P4", `${w}: screenshot saved`, true, path.relative(ROOT, shot));
    record("P4", `${w}: no horizontal overflow`, m.scrollWidth <= w && !m.overflow.length, m.overflow.slice(0, 5).join(", ") || `scrollWidth ${m.scrollWidth}`);
    if (w === 390) record("P4", "390: every visible control is at least 44x44", !m.small.length, m.small.slice(0, 8).join("; ") || "all pass");
    record("P4", `${w}: exactly one h1 and one main`, m.h1 === 1 && m.mains === 1, `h1=${m.h1} main=${m.mains}`);
    record("P4", `${w}: all five sections drawn`, ["hero", "menu", "work", "visit", "book"].every((s) => m.sections.includes(s)), m.sections.join(","));
    if (w === 390) {
      const bad = m.froms.filter((f) => !parseBinding(f));
      record("P2", "every data-from on the page is an allow-listed binding", !bad.length, bad.join(", ") || `${m.froms.length} distinct stamps`);
      record("P2", "no digit on the page sits outside a data-from binding", !m.digits.length, m.digits.slice(0, 5).join(" | ") || "0 unbound digits");
    }

    // Every link and button outside the booking flow (the booking flow is clicked in P3).
    const controls = await page.evaluate(() => [...document.querySelectorAll(".site a, .site button, .site summary, .site input")]
      .filter((e) => !e.closest(".bk") && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== "hidden")
      .map((e, i) => { e.dataset.probe = String(i); return { i, tag: e.tagName, href: e.getAttribute("href"), type: e.type, label: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 40) }; }));
    const clickFails = [];
    for (const c of controls) {
      const el = page.locator(`[data-probe="${c.i}"]`);
      try {
        if (c.tag === "INPUT" && c.type === "range") {
          await el.focus(); const before = await el.inputValue();
          for (let k = 0; k < 5; k++) await page.keyboard.press("ArrowRight");
          const after = await el.inputValue();
          const clip = await el.evaluate((e) => getComputedStyle(e.closest(".cmp-frame").querySelector(".cmp-after")).clipPath);
          if (Number(after) !== Number(before) + 5 || !clip.includes(`${after}%`)) clickFails.push(`slider ${before}->${after} clip ${clip}`);
          continue;
        }
        if (c.href && /^(tel|sms):/.test(c.href)) {
          if (!/^(tel|sms):562-555-0100$/.test(c.href)) clickFails.push(`${c.label}: ${c.href}`);
          // Clicking hands the number to the phone's dialer; in a headless browser it must simply not break the page.
          await el.evaluate((e) => e.addEventListener("click", (ev) => ev.preventDefault(), { once: true }));
          await el.click(); continue;
        }
        if (c.tag === "SUMMARY") {
          await el.click();
          if (!(await el.evaluate((e) => e.parentElement.open))) clickFails.push(`FAQ "${c.label}" did not open`);
          continue;
        }
        if (c.href?.startsWith("#")) {
          // The skip link sits off-screen until it has focus, so it is used the way it is meant to be: Tab, Enter.
          if (/skip/i.test(c.label)) { await el.focus(); await page.keyboard.press("Enter"); } else await el.click();
          await page.waitForTimeout(150);
          const landed = await page.evaluate((hash) => {
            const t = document.getElementById(hash.slice(1)); if (!t) return { ok: false, why: "no target" };
            const top = t.getBoundingClientRect().top, nav = document.querySelector(".site-nav").getBoundingClientRect().height;
            return { ok: location.hash === hash && top > -2 && top < Math.max(nav + 4, innerHeight * 0.6), top: Math.round(top) };
          }, c.href);
          if (!landed.ok) clickFails.push(`${c.label} ${c.href} ${JSON.stringify(landed)}`);
          continue;
        }
        if (c.href === "/") continue; // not-found page only
        clickFails.push(`unhandled control ${c.tag} ${c.label}`);
      } catch (e) { clickFails.push(`${c.label}: ${e.message.split("\n")[0]}`); }
    }
    record("P4", `${w}: clicked all ${controls.length} links and buttons outside the booking flow`, !clickFails.length, clickFails.join("; ") || "");
    // WCAG 2.1 AA by axe-core (installed in app/), serious and critical only, like site-browser.mjs G2.
    await page.addScriptTag({ path: createRequire(path.join(APP, "package.json")).resolve("axe-core/axe.min.js") });
    const axe = await page.evaluate(() => window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] } }));
    const serious = axe.violations.filter((x) => ["serious", "critical"].includes(x.impact));
    record("P4", `${w}: axe WCAG AA, no serious or critical violations`, !serious.length,
      serious.map((x) => `${x.id} (${x.nodes.length}): ${x.nodes[0].target.join(" ")}`).join("; ") || `${axe.violations.length} minor/moderate`);
    record("P4", `${w}: no console errors or warnings`, !problems.length, problems.slice(0, 5).join(" | "));
    await context.close();
  }

  // ---------------------------------------------------------------- P4 reduced motion
  {
    const { context, page, problems } = await open(390, 844, { reducedMotion: "reduce" });
    await load(page);
    const r = await page.evaluate(() => ({
      lite: document.documentElement.classList.contains("lite"),
      running: document.getAnimations().filter((a) => a.playState === "running").length,
      hidden: [...document.querySelectorAll(".site h1, .site h2, .site p, .site img, [data-section]")].filter((e) => Number(getComputedStyle(e).opacity) < 0.99).length,
    }));
    record("P4", "reduced motion: nothing running, nothing hidden", r.lite && r.running === 0 && r.hidden === 0, r);
    record("P4", "reduced motion: no console errors", !problems.length, problems.join(" | "));
    await context.close();
  }

  // ---------------------------------------------------------------- P1 dashboard edits → reload
  {
    await reset();
    const { context, page, problems } = await open(390, 844);
    await load(page);
    const price = `[data-section="menu"] [data-from="service:${ID(302)}.price"]`;
    const before = await text(page, price);
    const svc = T().services.find((s) => s.id === ID(302));
    svc.price = 205;                                                     // a price change
    T().services.find((s) => s.id === ID(303)).is_active = false;        // a service hidden
    T().business_hours.find((x) => x.weekday === 3).close_time = "15:00"; // Wednesday closes early
    T().business_settings[0].site_discount_active = false;               // the sale ends
    T().business_settings[0].faqs[0].q = "Do you confirm every request?"; // an FAQ edited
    await load(page);
    const after = await text(page, price);
    const heroAfter = await text(page, `[data-section="hero"] [data-from="service:${ID(302)}.price"]`);
    const bookingText = await text(page, '[data-section="book"]');
    record("P1", "price change shows after reload (menu)", before.includes("$185") && after.includes("$205"), `${before.replace(/\s+/g, " ")} -> ${after.replace(/\s+/g, " ")}`);
    record("P1", "price change shows after reload (hero ticket and booking step)", heroAfter.includes("$205") && bookingText.includes("$205") && !bookingText.includes("$185"), heroAfter.replace(/\s+/g, " "));
    record("P1", "hidden service disappears everywhere", (await page.locator(`[data-from^="service:${ID(303)}"]`).count()) === 0 && !bookingText.includes("Complete care"));
    record("P1", "hours change shows", (await text(page, '[data-from="hours.week"]')).includes("9 AM – 3 PM"));
    record("P1", "sale that ended disappears", (await page.locator('[data-from="sale"]').count()) === 0);
    record("P1", "FAQ edit shows", (await text(page, '[data-from="faq"]')).includes("Do you confirm every request?"));
    await page.screenshot({ path: path.join(OUT, "edited-390.png"), fullPage: true });
    record("P1", "no console errors across the edit reloads", !problems.length, problems.join(" | "));
    await context.close();
    await reset();
  }

  // ---------------------------------------------------------------- P3 book through the site
  {
    await reset();
    const { context, page, problems } = await open(390, 844);
    await load(page);
    await page.locator('[data-section="hero"] [data-book]').click();
    await page.waitForTimeout(400);
    record("P3", "Book in the hero lands on booking step one", await page.locator('[data-booking-step="1"]').isVisible());
    const book = page.locator('[data-section="book"]');
    const cont = book.locator(".bk-bar button.bk-btn.primary");
    const enabled = (ms) => page.waitForFunction(() => {
      const b = document.querySelector('[data-section="book"] .bk-bar button.bk-btn.primary');
      return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
    }, null, { timeout: ms }).then(() => true).catch(() => false);
    const steps = [];
    let shownTotal = null;
    for (let n = 1; n <= 9; n++) {
      const stepNo = Number(await book.locator("[data-booking-step]").getAttribute("data-booking-step"));
      const heading = (await book.locator(".bk-step-head h2").innerText()).trim();
      steps.push(`${stepNo}:${heading}`);
      if (/check everything/i.test(heading)) break;
      if (/pick your services/i.test(heading)) await book.locator(".bk-card.selectable", { hasText: "Hand wash" }).first().click();
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
            if (await book.locator(".bk-slots .bk-chip").count()) { await book.locator(".bk-slots .bk-chip").first().click(); picked = true; break; }
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
      await page.screenshot({ path: path.join(OUT, `booking-step-${stepNo}-390.png`) });
      await cont.click();
      await page.waitForTimeout(700);
    }
    shownTotal = (await book.locator(".bk-bar .total strong").innerText()).trim();
    await page.screenshot({ path: path.join(OUT, "booking-review-390.png") });
    record("P3", "walked every booking step inside the site", steps.length >= 6, steps.join(" → "));
    const send = book.getByRole("button", { name: /request this time|confirm booking/i });
    await send.click();
    await book.locator("h2", { hasText: /holding your time|you’re booked/i }).waitFor({ timeout: 15000 });
    await page.screenshot({ path: path.join(OUT, "booking-done-390.png") });
    record("P3", "the site shows the confirmation in its own design", await book.locator(".bk.bk-embedded").count() === 1 && await page.locator("h1").count() === 1);

    // The confirmation's two links: the calendar file from the engine, and the
    // customer's own booking page, which the main app serves at /booking/<id>.
    const ics = await book.getByRole("link", { name: /add to my calendar/i }).getAttribute("href");
    const receipt = await book.getByRole("link", { name: /view, change or cancel/i }).getAttribute("href");
    const receiptRes = await fetch(new URL(receipt, BASE));
    record("P3", "confirmation links point at the calendar file and the booking's own page",
      ics.startsWith(`${engine.url}/functions/v1/booking-ics`) && /^\/booking\/[\w-]+$/.test(receipt) && receiptRes.ok && (await receiptRes.text()).includes('id="root"'),
      `${ics.replace(engine.url, "<engine>")} · ${receipt} (${receiptRes.status})`);
    const calls = await (await fetch(`${engine.url}/__demo/calls`)).json();
    const post = calls.find((c) => c.path === "/functions/v1/create-booking" && c.method === "POST" && c.status === 200);
    record("P3", "a create-booking post was recorded by the offline engine", !!post, post ? `${post.body.booking_date} ${post.body.start_time}, ref ${post.body.booking_ref}` : calls.map((c) => `${c.path}:${c.status}`).join(", "));
    if (post) {
      const { customer_name, customer_email, customer_phone, booking_ref, shown_total, sms_consent, ...quoteBody } = post.body;
      const q = await (await fetch(`${engine.url}/functions/v1/calculate-booking`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(quoteBody) })).json();
      const stored = T().bookings.at(-1);
      const n = (s) => Number(String(s).replace(/[^\d.]/g, ""));
      record("P3", "quote equals calculate-booking (shown, sent, stored)",
        q.quote.total === Number(shown_total) && q.quote.total === n(shownTotal) && q.quote.total === stored?.total_price,
        `calculate-booking ${q.quote.total} · on screen ${shownTotal} · shown_total sent ${shown_total} · stored ${stored?.total_price} (Hand wash $95 less the 10% sample sale)`);
      record("P3", "exactly one booking row written", T().bookings.length === 1, `${T().bookings.length} row(s), status ${stored?.status}`);
    }
    record("P3", "no console errors during the booking", !problems.length, problems.join(" | "));
    await context.close();
    await reset();
  }

  // ---------------------------------------------------------------- P5 not-found + route unchanged
  {
    const { context, page, problems } = await open(390, 844);
    await page.goto(`${BASE}/site/nope`, { waitUntil: "networkidle" });
    record("P5", "unknown slug shows a clear not-found", (await page.locator("h1").innerText()).includes("There is no site at this address"));
    await page.screenshot({ path: path.join(OUT, "not-found-390.png") });
    await page.goto(`${BASE}/book/brightline`, { waitUntil: "networkidle" });
    await page.waitForSelector(".bk-step-head h2", { timeout: 15000 });
    record("P5", "/book/brightline still draws the ordinary booking page", (await page.locator(".bk-header h1").innerText()).includes("Brightline Auto Care") && (await page.locator(".bk-embedded").count()) === 0);
    record("P5", "no console errors on those pages", !problems.filter((p) => !/404/.test(p)).length, problems.join(" | "));
    await context.close();
  }

  // ---------------------------------------------------------------- P6 the built bundle
  if (BUILT) {
    const dist = path.join(os.tmpdir(), `studio-s1-dist-${process.pid}`);
    try {
      execFileSync(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "build", "--outDir", dist, "--emptyOutDir"],
        { cwd: APP, env: { ...process.env, ...env }, windowsHide: true, stdio: "pipe" });
      const port = await freePort();
      const preview = startVite(["preview", "--outDir", dist, "--port", String(port), "--strictPort", "--host", "127.0.0.1"], env);
      try {
        await until(() => fetch(`http://127.0.0.1:${port}/site/brightline`).then((r) => r.ok), 30000);
        const { context, page, problems } = await open(390, 844);
        await load(page, `http://127.0.0.1:${port}/site/brightline`);
        record("P6", "built preview serves /site/brightline with live prices", (await text(page, '[data-section="menu"]')).includes("$185"));
        const css = await page.evaluate(() => [...document.styleSheets].map((s) => s.href || "").join(" ") + [...document.fonts].map((f) => f.family).join(","));
        record("P6", "the dashboard's stylesheet and fonts are not loaded", !/Archivo|JetBrains|index-[\w-]+\.css/.test(css), css.slice(0, 200));
        await page.goto(`http://127.0.0.1:${port}/site/nope`, { waitUntil: "networkidle" });
        record("P6", "built preview: unknown slug shows not-found", (await page.locator("h1").innerText()).includes("There is no site"));
        record("P6", "built preview: no console errors", !problems.length, problems.join(" | "));
        await context.close();
      } finally { preview.child.kill(); }
    } catch (e) { record("P6", "build and preview", false, e.message.split("\n")[0]); }
    finally { rmSync(dist, { recursive: true, force: true }); }
  }
} catch (e) {
  record("RUN", "check ran to completion", false, e.stack || e.message);
} finally {
  await browser.close();
  dev.child.kill();
  await engine.close();
}

const failed = results.filter((r) => !r.pass);
writeFileSync(path.join(OUT, "results.json"), JSON.stringify({ ran: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results }, null, 2) + "\n");
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed — ${path.relative(ROOT, path.join(OUT, "results.json"))}`);
process.exit(failed.length ? 1 : 0);
