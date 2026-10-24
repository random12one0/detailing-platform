// ROADMAP 97.53 — the "Your calendar" section on Notifications, proved in a browser.
//
//   BASE=http://127.0.0.1:5180 node scripts/calendar-feed-screen.mjs [--shots=<dir>] [--break=hide]
//
// Signs in as the demo owner, opens Notifications, and at 390, 320, 768 and 1440 asks: the
// section is there; if the business has no link yet, "Create calendar link" makes one; the link
// box shows a feed URL for THIS business with a 64-hex token and fits the width; Copy and
// Reset link are on screen and pressable (44px, nothing covering them); Reset asks first and,
// once confirmed, shows a DIFFERENT token and says the new link is ready; no sideways scroll;
// the console is clean. Every width is asked the same 9 questions, so a run that reached fewer
// widths says so by its count.
//
// The password comes from `.env` (DEMO_OWNER_PW) through scripts/lib/demoOwner.mjs. Against the
// belt's in-memory demo back end (the app's Supabase is 127.0.0.1), sign-in accepts anything,
// so no password is needed or read. Writes go wherever the app writes: on the demo back end
// that is memory only; against the real project it resets the demo tenant's calendar link.
//
// --break=hide hides the section with CSS; the run must then go red at every width.
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import path from "node:path";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || "";
const SHOTS = (process.argv.find((a) => a.startsWith("--shots=")) || "").split("=")[1] || "";
const SIZES = [{ w: 390, h: 844 }, { w: 320, h: 740 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const PER_WIDTH = 9;
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

let asked = 0;
const failures = [];
const check = (label, name, ok, detail = "") => {
  asked++;
  if (!ok) failures.push(`${label} ${name}${detail ? " — " + detail : ""}`);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} ${name}${detail ? " — " + detail : ""}`);
};

async function password() {
  const src = await (await fetch(`${BASE}/src/lib/supabase.js`)).text().catch(() => "");
  if (/"VITE_SUPABASE_URL":\s*"http:\/\/(127\.0\.0\.1|localhost)/.test(src)) return "demo-backend";
  const { demoOwner } = await import("./lib/demoOwner.mjs");
  return demoOwner().password;
}

// The section's state, read where the reader is standing.
const READ = () => {
  const head = [...document.querySelectorAll("h1,h2,h3,h4,.group-title,.eyebrow,legend,div,span")]
    .find((el) => el.children.length === 0 && el.textContent.trim() === "Your calendar");
  const box = document.querySelector('input[aria-label="Calendar link"]');
  const btn = (txt) => [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === txt && b.offsetParent);
  const press = (b) => {
    if (!b) return null;
    b.scrollIntoView({ block: "center" });
    const r = b.getBoundingClientRect();
    const at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    const s = getComputedStyle(b, "::after");
    // A small button may grow its target with a negative-inset ::after (design system, 44px rule).
    const grow = s.content !== "none" && s.position === "absolute" ? Math.max(0, -parseFloat(s.top) || 0) + Math.max(0, -parseFloat(s.bottom) || 0) : 0;
    return { ok: !!at && (at === b || b.contains(at)), h: Math.round(r.height + grow) };
  };
  if (box) box.scrollIntoView({ block: "center" });
  const r = box?.getBoundingClientRect();
  const head_r = head?.getBoundingClientRect();
  return {
    section: !!head && head_r.height > 0 && getComputedStyle(head).visibility !== "hidden",
    create: !!btn("Create calendar link"),
    url: box?.value || "",
    fits: r ? r.left >= 0 && r.right <= innerWidth + 0.5 : false,
    boxAt: r ? `${Math.round(r.left)}–${Math.round(r.right)} of ${innerWidth}` : "no box",
    copy: press(btn("Copy")),
    reset: press(btn("Reset link")),
    sideways: document.documentElement.scrollWidth - innerWidth,
    ok: document.querySelector(".ok-box")?.textContent.trim() || "",
  };
};
const tokenOf = (url) => /[?&]token=([0-9a-f]{64})(&|$)/.exec(url)?.[1] || null;

const browser = await chromium.launch();
const pw = await password();
let signedIn = null;
for (const { w, h } of SIZES) {
  const label = `${w}x${h}`;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, storageState: signedIn || undefined });
  const page = await ctx.newPage();
  const noise = [];
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(m.text().slice(0, 160)); });
  page.on("pageerror", (e) => noise.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", "demo@detailplatform.com");
    await page.fill("input[type=password]", pw);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
    signedIn = await ctx.storageState();
  }
  await page.evaluate(() => {
    try {
      localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
      localStorage.setItem("dp.tour", "1");
    } catch { /* private mode */ }
  });
  await page.goto(`${BASE}/app?settings=notifications`, { waitUntil: "domcontentloaded" });
  await page.getByText("Your calendar", { exact: true }).first().waitFor({ state: "attached", timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
  if (BREAK === "hide") await page.addStyleTag({ content: 'input[aria-label="Calendar link"], .group:has(input[aria-label="Calendar link"]), .group:has(button) h2 { display: none !important; }' });

  let s = await page.evaluate(READ);
  if (s.create) {
    console.log(`  ..   ${label} no link yet: pressing Create calendar link`);
    await page.getByRole("button", { name: "Create calendar link" }).click();
    await page.locator('input[aria-label="Calendar link"]').waitFor({ timeout: 10000 }).catch(() => {});
    s = await page.evaluate(READ);
  }
  check(label, "section/shown", s.section, "the Your calendar heading is painted");
  check(label, "link/this-business", /calendar-feed\?business=demo-detail&token=/.test(s.url), s.url ? s.url.replace(/token=[0-9a-f]+/, "token=…").replace(/apikey=[^&]+/, "apikey=…") : "no link box");
  check(label, "link/64-hex-token", !!tokenOf(s.url));
  check(label, "link/fits", s.fits, s.boxAt);
  check(label, "copy/pressable-44", !!s.copy?.ok && s.copy.h >= 44, s.copy ? `hit ${s.copy.ok}, ${s.copy.h}px` : "no Copy button");
  check(label, "reset/pressable-44", !!s.reset?.ok && s.reset.h >= 44, s.reset ? `hit ${s.reset.ok}, ${s.reset.h}px` : "no Reset link button");
  if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `link-${label}.png`), fullPage: false });

  // Reset: it asks first, and only the confirmed press changes the link.
  const before = tokenOf(s.url);
  let after = null, ok = "";
  if (s.reset) {
    await page.getByRole("button", { name: "Reset link" }).click();
    const asks = page.getByText("Reset the calendar link?", { exact: false });
    await asks.first().waitFor({ timeout: 5000 }).catch(() => {});
    const askedFirst = await asks.count() > 0 && tokenOf(await page.locator('input[aria-label="Calendar link"]').inputValue()) === before;
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `reset-asks-${label}.png`), fullPage: false });
    await page.getByRole("button", { name: "Reset it" }).click().catch(() => {});
    await page.locator(".ok-box").waitFor({ timeout: 10000 }).catch(() => {});
    const r = await page.evaluate(READ);
    after = tokenOf(r.url); ok = r.ok;
    check(label, "reset/asks-then-changes", askedFirst && !!after && after !== before && /New link ready/.test(ok),
      `asked first ${askedFirst}, token ${after && after !== before ? "changed" : "unchanged"}, message "${ok}"`);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, `reset-done-${label}.png`), fullPage: false });
  } else check(label, "reset/asks-then-changes", false, "no Reset link button to press");
  const end = await page.evaluate(READ);
  check(label, "no-sideways-scroll", end.sideways <= 0, `${end.sideways}px`);
  check(label, "console/clean", noise.length === 0, noise.slice(0, 3).join(" | "));
  await ctx.close();
}
await browser.close();

const expected = SIZES.length * PER_WIDTH;
console.log(`\n${asked} of ${expected} questions asked at ${SIZES.length} widths${BREAK ? ` (sabotage: ${BREAK})` : ""}; ${failures.length} failed.`);
if (asked !== expected) { console.log("FAIL: the run did not ask every question it declares"); process.exit(1); }
process.exit(failures.length ? 1 : 0);
