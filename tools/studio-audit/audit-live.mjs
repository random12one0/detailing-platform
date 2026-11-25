// ===========================================================================
// AFTER A PUBLISH — a short, read-only look at the live site (plan §6, chunk 14).
// ===========================================================================
//
// Andrew publishes; this confirms the publish worked. It notices a publish by the
// site's code bundle changing name (CLAUDE.md "Publishing": the hash in
// assets/index-<hash>.js is what changes), then opens a few public pages and the
// sign-in page and reads them. NOTHING is typed, pressed or submitted on live.

import { REPO_ROOT } from "./paths.mjs";
import { createRequire } from "node:module";
import path from "node:path";

const REPO = process.env.AUDIT_REPO || REPO_ROOT;
export const LIVE = process.env.AUDIT_LIVE_URL || "https://detailingplatform.com";
const PAGES = [
  { path: "/", expect: /detail/i, what: "home page" },
  { path: "/pricing", expect: /\$\d/, what: "pricing" },
  { path: "/book/demo-detail", expect: /\$\d/, what: "a booking page shows services and prices" },
  { path: "/app", expect: /password|sign in|log in/i, what: "sign-in page" },
];

export async function liveBundle() {
  const r = await fetch(LIVE + "/", { signal: AbortSignal.timeout(15000) });
  const html = await r.text();
  return (html.match(/assets\/index-[A-Za-z0-9_-]+\.js/) || [null])[0];
}

export async function liveCheck({ log = () => {} } = {}) {
  const { chromium } = createRequire(path.join(REPO, "app", "x.js"))("playwright");
  const browser = await chromium.launch();
  const pages = [];
  try {
    for (const pg of PAGES) {
      for (const [w, h] of [[390, 844], [1440, 900]]) {
        const ctx = await browser.newContext({ viewport: { width: w, height: h } });
        const p = await ctx.newPage();
        const errors = [], failed = [];
        p.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
        p.on("pageerror", (e) => errors.push(String(e.message).slice(0, 200)));
        p.on("response", (r) => { if (r.status() >= 500) failed.push(`${r.status()} ${new URL(r.url()).pathname}`); });
        // read-only: block every request that could change something. track-visit and database
        // procedures are blocked too: the check must not show up in the platform's own visitor numbers.
        await p.route("**/*", (route) => ["GET", "HEAD", "OPTIONS"].includes(route.request().method()) || /\/functions\/v1\/(available-slots|calculate-booking|address-suggest)\b|\/rest\/v1\/rpc\/(get_public_business_profile|platform_prices|founding_offer)\b/.test(route.request().url())
          ? route.continue() : route.abort());
        let status = 0, text = "";
        try { const resp = await p.goto(LIVE + pg.path, { waitUntil: "domcontentloaded", timeout: 30000 }); status = resp?.status() || 0; await p.waitForTimeout(3000); text = await p.evaluate(() => document.body.innerText); }
        catch (e) { errors.push(`could not open: ${e.message.slice(0, 120)}`); }
        const ok = status > 0 && status < 400 && pg.expect.test(text) && !failed.length && !errors.some((e) => !/net::ERR_FAILED|blocked/i.test(e));
        pages.push({ path: pg.path, what: pg.what, width: w, status, ok, errors: errors.slice(0, 5), failed: failed.slice(0, 5), found: pg.expect.test(text) });
        await ctx.close();
      }
      log(`live ${pg.path}`);
    }
  } finally { await browser.close(); }
  return { at: new Date().toISOString(), bundle: await liveBundle().catch(() => null), ok: pages.every((x) => x.ok), pages };
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  const r = await liveCheck({ log: console.log });
  console.log(JSON.stringify({ ok: r.ok, bundle: r.bundle, pages: r.pages.map((x) => `${x.ok ? "ok " : "BAD"} ${x.width} ${x.path} ${x.status} ${x.found ? "" : "(expected text missing)"} ${[...x.errors, ...x.failed].join(" | ").slice(0, 160)}`) }, null, 1));
}
