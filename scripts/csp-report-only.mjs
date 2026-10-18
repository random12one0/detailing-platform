// WHERE A PAGE MAY LOAD FROM — ROADMAP 97.26.
//
// `app/netlify.toml` sends a `Content-Security-Policy-Report-Only` on every
// path. Report-only blocks nothing, so the ONLY evidence it is right is that a
// real browser walking the real pages raises no violation. This serves the
// BUILT app (app/dist) with exactly the headers app/netlify.toml declares, and
// at 390x844, 768x1024 and 1440x900 visits:
//
//   /, /pricing, /book/demo-detail walked to its LAST step (never submitted,
//   so it writes no booking), /app signed in as the demo owner, /app signed in
//   as the demo STAFF member (a second account), /app/business as the owner
//   WITH A CUSTOM DOMAIN, and /ex1.
//
// THE CUSTOM DOMAIN IS FAKED IN THE BROWSER, never written: the
// business_domains read is answered with TENANT below, and that host is served
// from app/dist. A detailer with their own domain gets the "What customers
// see" preview framed FROM THAT DOMAIN (components/PagePreview.jsx), so
// frame-src must admit a host nobody can list in advance.
//
// A violation is caught two ways, and the canary proves both can see one:
//   - the `securitypolicyviolation` event, in every frame, via a binding;
//   - Chromium's console line ("[Report Only] Refused to load ...").
//
// It also models the `/book/*` rule (R4): that path must still carry its
// enforcing `frame-ancestors` header, under a different name from this one,
// so the two never merge. `scripts/preview-frame-headers.mjs` proves the
// framing in a browser; this only proves the headers were not disturbed.
//
// SABOTAGE (an argument to THIS script):
//   --break=no-policy  drop the header — the original defect. Must go red on
//                      every view for a missing header.
//   --break=no-fonts   drop fonts.googleapis.com from style-src. Must go red
//                      with violations on every page that loads the fonts.
//   --break=no-tenant-frames  drop https: from frame-src — the policy as first
//                      shipped. Must go red on /app/business only.
//   --break=inline-script  serve /ex1../ex5 with their scripts put back INLINE —
//                      the pages as they were before ROADMAP 97.90. Must go red
//                      on every example view (script-src has no 'unsafe-inline').
//   --break=unsafe-inline  put 'unsafe-inline' back in script-src. Must go red on
//                      the policy line and nowhere else.
// CANARY, every run: /__csp-canary loads an image from a host the policy does
// not list; both detectors must report it.
//
// ROADMAP 97.90 ADDED: every example page (/ex1../ex5 and their extra pages),
// /examples and /map.html; Billing with STRIPE'S CARD FORM mounted (the server's
// "subscribe" reply is answered in the browser with a made-up client secret, so
// nothing is written and nothing is charged — Stripe.js, its frames and its API
// calls are real); a scan of every built HTML file for inline script; and
// --as-enforced, which serves the same policy under the ENFORCING header name,
// joined with /book/*'s frame-ancestors the way Netlify would join two rules —
// a rehearsal of the rename, not the rename. The header name is read from
// app/netlify.toml, so once the rule is renamed a plain run reads the new one.
//
// Needs: `npm run build --prefix app` first, and DEMO_OWNER_PW and DEMO_STAFF_PW
// in the environment (`.env`). Reads only; signs in, writes nothing.
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { createRequire } from "node:module";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";
import { settle, stepNow } from "./lib/bookingWalk.mjs";

const { chromium } = createRequire(join(REPO, "app", "package.json"))("playwright");
const DIST = join(REPO, "app", "dist");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
if (BREAK && !["no-policy", "no-fonts", "no-tenant-frames", "inline-script", "unsafe-inline"].includes(BREAK)) throw new Error(`unknown --break=${BREAK}`);
const AS_ENFORCED = process.argv.includes("--as-enforced");
if (!existsSync(join(DIST, "index.html")) || !existsSync(join(DIST, "ex1", "index.html"))) {
  throw new Error("app/dist is missing or has no /ex1 — run `npm run build --prefix app` first");
}
const SHOTS = `.manager-shots/97.26/${BREAK || "clean"}${AS_ENFORCED ? "-enforced" : ""}`;
const SIZES = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const PAGES = [{ path: "/" }, { path: "/pricing" }, { path: "/book/demo-detail" }, { path: "/app", as: "owner" },
  { path: "/app", as: "staff" }, { path: "/app/business", as: "owner", domain: true },
  { path: "/app?settings=billing", as: "owner", stripe: true },
  { path: "/ex1", ex: true }, { path: "/ex1/work.html", ex: true }, { path: "/ex1/prices.html", ex: true },
  { path: "/ex2", ex: true }, { path: "/ex3", ex: true }, { path: "/ex3/prices.html", ex: true },
  { path: "/ex4", ex: true }, { path: "/ex5", ex: true }, { path: "/examples" }, { path: "/map.html" }];
const TENANT = "https://csp-tenant-domain.test";
const ENFORCING = "Content-Security-Policy", REPORT_ONLY = "Content-Security-Policy-Report-Only";
const CANARY_PATH = "/__csp-canary";

// ── THE RULES, FROM THE REAL FILE (same reading as preview-frame-headers.mjs) ──
function parseHeaderRules(toml) {
  const rules = [];
  let cur = null, inValues = false;
  for (const raw of toml.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    if (line === "[[headers]]") { cur = { for: null, values: {} }; rules.push(cur); inValues = false; continue; }
    if (line === "[headers.values]" && cur) { inValues = true; continue; }
    if (line.startsWith("[")) { cur = null; inValues = false; continue; }
    const m = line.match(/^([A-Za-z0-9-]+)\s*=\s*"(.*)"$/);
    if (!m || !cur) continue;
    if (inValues) cur.values[m[1]] = m[2];
    else if (m[1] === "for") cur.for = m[2];
  }
  return rules;
}
const forRe = (p) => new RegExp("^" + p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$");
function headersFor(rules, path) {
  const out = {}, dupes = [];
  for (const r of rules) {
    if (!r.for || !forRe(r.for).test(path)) continue;
    for (const [k, v] of Object.entries(r.values)) {
      if (k in out) { dupes.push(k); out[k] += ", " + v; } else out[k] = v;
    }
  }
  return { headers: out, dupes };
}

const rules = parseHeaderRules(readFileSync(join(REPO, "app", "netlify.toml"), "utf8"));
// The /* rule carrying the site policy, under whichever name the file uses.
const all = rules.find((r) => r.for === "/*" && (ENFORCING in r.values || REPORT_ONLY in r.values));
if (!all) throw new Error(`app/netlify.toml has no /* rule setting ${ENFORCING} or ${REPORT_ONLY}`);
const DECLARED = ENFORCING in all.values ? ENFORCING : REPORT_ONLY;
if (AS_ENFORCED && DECLARED === REPORT_ONLY) { all.values[ENFORCING] = all.values[REPORT_ONLY]; delete all.values[REPORT_ONLY]; }
const NAME = AS_ENFORCED ? ENFORCING : DECLARED;
const POLICY = all?.values[NAME] || "";
if (BREAK === "no-policy") delete all.values[NAME];
if (BREAK === "no-fonts") {
  if (!POLICY.includes(" https://fonts.googleapis.com")) throw new Error("--break=no-fonts found nothing to remove");
  all.values[NAME] = POLICY.replace(" https://fonts.googleapis.com", "");
}
if (BREAK === "no-tenant-frames") {
  if (!/frame-src [^;]* https:(;| )/.test(POLICY)) throw new Error("--break=no-tenant-frames found nothing to remove");
  all.values[NAME] = POLICY.replace(/(frame-src [^;]*) https:(?=;| )/, "$1");
}
if (BREAK === "unsafe-inline") all.values[NAME] = POLICY.replace("script-src 'self'", "script-src 'self' 'unsafe-inline'");
const SERVED = all?.values[NAME] || "";
const SCRIPT_SRC = (SERVED.match(/(?:^|;)\s*script-src ([^;]*)/) || [])[1] ?? null;

// ── THE SERVER ────────────────────────────────────────────────────────────────
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".json": "application/json",
  ".woff2": "font/woff2", ".webmanifest": "application/manifest+json" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === CANARY_PATH) {
    res.writeHead(200, { "Content-Type": "text/html", [NAME]: POLICY });
    res.end('<!doctype html><title>canary</title><img src="https://csp-canary.invalid/x.png" alt="">');
    return;
  }
  let file = join(DIST, path);
  if (file.startsWith(DIST) && existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!file.startsWith(DIST) || !existsSync(file) || statSync(file).isDirectory()) file = join(DIST, "index.html");
  res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream", ...headersFor(rules, path).headers });
  if (BREAK === "inline-script" && /^\/ex\d/.test(path) && file.endsWith(".html")) {
    res.end(readFileSync(file, "utf8").replace(/<script src="(\/ex\d\/[^"]+\.js)"><\/script>/g,
      (_, src) => `<script>${readFileSync(join(DIST, src), "utf8")}</script>`));
    return;
  }
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const A = `http://127.0.0.1:${server.address().port}`;

const failures = [], warnings = [], artifacts = [];
let assertions = 0;
const ok = (cond, id, msg) => { assertions++; if (!cond) failures.push(`${id}: ${msg}`); return cond; };
const observed = { views: {}, canary: null, book: null };

// Every frame reports its violations to Node; console lines are the second net.
async function watch(ctx) {
  const sink = { events: [], console: [], noise: [] };
  await ctx.exposeBinding("__cspSeen", (_src, v) => { sink.events.push(v); });
  await ctx.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (e) => {
      window.__cspSeen?.({ directive: e.violatedDirective, blocked: e.blockedURI, doc: e.documentURI,
        disposition: e.disposition, sample: e.sample });
    });
  });
  ctx.on("console", (m) => {
    const t = m.text();
    if (/Content Security Policy/i.test(t)) sink.console.push(t.slice(0, 300));
    else if (["error", "warning"].includes(m.type())) sink.noise.push(t.slice(0, 200));
  });
  return sink;
}
const ours = (v) => { try { return [A, TENANT].includes(new URL(v.doc).origin); } catch { return false; } };

// The detailer's own domain: the lookup answers with it, and the host is served
// from the same build with the same headers. Its /book/* frame-ancestors names
// detailingplatform.com, which this local dashboard is not, so the parent here
// is added to it; scripts/preview-frame-headers.mjs proves the real rule.
async function fakeDomain(ctx) {
  await ctx.route(/\/rest\/v1\/business_domains\?/, (r) => r.fulfill({
    status: 200, contentType: "application/json", body: JSON.stringify([{ domain: new URL(TENANT).host }]) }));
  await ctx.route(TENANT + "/**", async (r) => {
    const u = new URL(r.request().url());
    const res = await r.fetch({ url: A + u.pathname + u.search });
    const headers = { ...res.headers() };
    if (headers["content-security-policy"]) headers["content-security-policy"] = headers["content-security-policy"].replace(/frame-ancestors [^;,]*/, (m) => m + " " + A);
    await r.fulfill({ response: res, headers });
  });
}

// STRIPE'S CARD FORM, ON BILLING (ROADMAP 97.90). The "subscribe" call would
// create a real subscription, so ONLY that call is answered here, with a
// made-up sandbox key and client secret; the summary is the real server's.
// Stripe.js, its iframes and its own API calls are real network traffic —
// Stripe refuses the made-up secret, which is what draws its error inside the
// frame, and the frames are what the policy has to admit.
async function fakeSubscribe(ctx) {
  await ctx.route(/\/functions\/v1\/platform-billing/, async (r) => {
    let body = {};
    try { body = JSON.parse(r.request().postData() || "{}"); } catch {}
    if (body.action !== "subscribe") return r.continue();
    await r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({
      client_secret: "pi_3CSP97x90NotReal_secret_csp97x90NotReal", publishable_key: "pk_test_csp97x90NotARealKey",
      amount_cents: 3500, return_url: A + "/app?settings=billing" }) });
  });
}
async function openCardForm(page) {
  const tick = page.locator("[data-billing-consent]");
  if (!(await tick.waitFor({ state: "attached", timeout: 30000 }).then(() => true, () => false))) return { frames: 0, loaded: false, stuck: "no consent box on Billing" };
  await tick.check();
  const go = page.locator("label.confirm-box ~ button.btn.primary").first();
  await go.click();
  await page.waitForFunction(() => document.querySelectorAll('[data-billing-card] iframe[src^="https://js.stripe.com"]').length > 0,
    null, { timeout: 30000 }).catch(() => {});
  await page.waitForTimeout(2500);
  return page.evaluate(() => ({ loaded: typeof window.Stripe === "function",
    frames: document.querySelectorAll('[data-billing-card] iframe[src^="https://js.stripe.com"]').length }));
}

// Walk the public booking page to its last step without pressing Book.
async function walkToLast(page) {
  await page.waitForSelector(".bk-step-head .bk-step-label", { timeout: 30000 });
  const total = (await stepNow(page))?.of;
  for (let guard = 0; guard < 12; guard++) {
    const at = await stepNow(page);
    if (!at || at.n === total) return { reached: at?.n ?? null, total };
    if (await page.locator(".bk-card.selectable").count() && !(await page.locator(".bk-card.selected").count())) {
      await page.locator(".bk-card.selectable").first().click();
      await settle(page, 1800);
    }
    if (await page.locator(".bk-cal").count() && !(await page.locator(".bk-slots .bk-chip.on, .bk-slots .bk-chip[aria-pressed=true]").count())) {
      let picked = false;
      for (let month = 0; month < 3 && !picked; month++) {
        if (month) { await page.getByRole("button", { name: "Next month" }).click(); await settle(page, 1500); }
        const cells = page.locator(".bk-cal .cell:not(.closed):not(.empty)");
        await cells.first().waitFor({ state: "attached", timeout: 6000 }).catch(() => {});
        for (let i = 0; i < await cells.count() && !picked; i++) {
          await cells.nth(i).click();
          await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 4000 }).catch(() => {});
          await settle(page, 900);
          picked = (await page.locator(".bk-slots .bk-chip").count()) > 0;
        }
      }
      if (!picked) return { reached: at.n, total, stuck: "no bookable slot in three months" };
      await page.locator(".bk-slots .bk-chip").first().click();
      await settle(page, 400);
    }
    for (const [sel, value] of [[".bk-field input[type=tel]", "5551234567"], [".bk-field input[type=email]", "casey@example.com"]]) {
      if (await page.locator(sel).count() && !(await page.locator(sel).first().inputValue())) await page.locator(sel).first().fill(value);
    }
    const year = page.locator('.bk-field input[inputmode="numeric"][maxlength="4"]').first();
    if (await year.count() && !(await year.inputValue())) { await year.fill("2019"); await settle(page, 400); }
    const enabled = (ms) => page.waitForFunction(() => {
      const b = document.querySelector(".bk-bar button.bk-btn.primary");
      return !!b && !b.disabled && b.getAttribute("aria-disabled") !== "true";
    }, null, { timeout: ms }).then(() => true, () => false);
    if (!(await enabled(6000))) {
      const h = await page.locator(".bk-step-head h2").innerText().catch(() => "");
      const text = page.locator('.bk-field input:not([type=tel]):not([type=email]):not([inputmode="numeric"])').first();
      if (await text.count() && !(await text.inputValue())) await text.fill(/reach you/i.test(h) ? "Casey Rivera" : "140 Market Street, Springfield");
      await settle(page, 400);
    }
    if (!(await enabled(4000))) return { reached: at.n, total, stuck: "Continue stayed disabled" };
    await page.locator(".bk-bar button.bk-btn.primary").click();
    await settle(page, 1500);
  }
  const at = await stepNow(page);
  return { reached: at?.n ?? null, total };
}

const browser = await chromium.launch();
try {
  // R4, as headers: /book/* keeps its own enforcing frame-ancestors, unmerged.
  {
    const { headers, dupes } = headersFor(rules, "/book/demo-detail");
    observed.book = headers;
    ok(/frame-ancestors 'self' https:\/\/detailingplatform\.com/.test(headers["Content-Security-Policy"] || ""),
      "book-frame-ancestors", "/book/* no longer carries its Content-Security-Policy frame-ancestors rule");
    // Under the ENFORCING name the site policy and /book/*'s frame-ancestors
    // share a header, and joined with a comma they are two policies, both
    // enforced. Any other shared header is still a fault.
    const shared = dupes.filter((d) => !(NAME === ENFORCING && d === ENFORCING));
    ok(shared.length === 0, "book-no-merge", `two matching rules both set ${shared.join(", ")} on /book/* — Netlify would join them`);
  }
  // The site policy itself: no frame-ancestors (it would join /book/*'s and
  // refuse the preview), and R2 — no 'unsafe-inline' in script-src.
  ok(!/frame-ancestors/.test(SERVED), "site-policy-no-frame-ancestors", "the /* policy carries frame-ancestors");
  ok(SCRIPT_SRC !== null && !SCRIPT_SRC.split(/\s+/).includes("'unsafe-inline'"), "script-src-no-unsafe-inline",
    SCRIPT_SRC === null ? "the /* policy has no script-src" : `script-src is "${SCRIPT_SRC}"`);

  // Every BUILT page, read as text: an inline <script>, an on*= handler or a
  // javascript: URL is refused by a script-src without 'unsafe-inline'. The
  // walk below only visits some pages; this reads all of them.
  {
    const html = readdirSync(DIST, { recursive: true }).filter((f) => String(f).endsWith(".html"));
    const found = [];
    for (const f of html) {
      const t = readFileSync(join(DIST, f), "utf8").replace(/<!--[\s\S]*?-->/g, "");
      for (const m of t.matchAll(/<script\b([^>]*)>/gi)) if (!/\bsrc=/i.test(m[1]) && !/application\/(ld\+)?json/i.test(m[1])) found.push(`${f}: inline <script${m[1]}>`);
      for (const m of t.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) found.push(`${f}: handler ${m[0].slice(0, 60)}`);
      for (const m of t.matchAll(/(?:href|src|action)\s*=\s*["']\s*javascript:/gi)) found.push(`${f}: ${m[0]}`);
    }
    observed.dist = { html_files: html.length, inline: found };
    // A discovery floor (docs/gotchas.md 98): the app, 8 example pages, /examples, /map.html.
    ok(html.length >= 11, "dist-pages-found", `read ${html.length} built HTML file(s); expected at least 11`);
    ok(found.length === 0, "dist-no-inline-script", `${found.length} inline script(s): ${found.slice(0, 4).join(" | ")}`);
  }

  // Canary: an unlisted host MUST be reported by both nets.
  {
    const ctx = await browser.newContext();
    const sink = await watch(ctx);
    const page = await ctx.newPage();
    await page.goto(A + CANARY_PATH, { waitUntil: "load" });
    await page.waitForTimeout(800);
    observed.canary = { events: sink.events.length, console: sink.console.length };
    ok(sink.events.filter(ours).length > 0 && sink.console.length > 0, "canary",
      `the canary's unlisted image raised ${sink.events.length} event(s) and ${sink.console.length} console line(s); both nets must see it`);
    await ctx.close();
  }

  // Sign in once per account: the owner, and the staff member as the second account.
  const state = {};
  for (const [as, who] of [["owner", demoOwner()], ["staff", demoStaff()]]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await page.goto(A + "/app", { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", who.email);
      await page.fill("input[type=password]", who.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
    }
    state[as] = await ctx.storageState();
    await ctx.close();
  }

  mkdirSync(join(REPO, SHOTS), { recursive: true });
  for (const s of SIZES) {
    for (const { path: p, as, domain, stripe, ex } of PAGES) {
      const tag = `${p}${as ? "~" + as : ""}@${s.w}`;
      const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h }, storageState: as ? state[as] : undefined });
      const sink = await watch(ctx);
      if (domain) await fakeDomain(ctx);
      if (stripe) await fakeSubscribe(ctx);
      const page = await ctx.newPage();
      const errors = [], scripts = new Map();
      page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
      page.on("response", (r) => { if (r.request().resourceType() === "script") scripts.set(new URL(r.url()).pathname, r.status()); });
      const res = await page.goto(A + p, { waitUntil: "load" });
      const header = res?.headers()[NAME.toLowerCase()] || "";
      const expected = headersFor(rules, new URL(p, A).pathname).headers[NAME] || "";
      ok(header === expected && header.length > 0, `header${tag}`, header ? "served a different policy from app/netlify.toml" : `no ${NAME} header`);
      const view = {};
      if (p === "/book/demo-detail") {
        view.walk = await walkToLast(page);
        ok(view.walk.reached !== null && view.walk.reached === view.walk.total, `book-last-step${tag}`,
          `walk stopped at step ${view.walk.reached} of ${view.walk.total}${view.walk.stuck ? ` (${view.walk.stuck})` : ""}`);
      }
      if (as) ok(await page.locator(".tabbar").waitFor({ timeout: 30000 }).then(() => true, () => false), `signed-in${tag}`, "the dashboard never drew its tab bar");
      if (domain) {
        // The preview must be framed FROM the detailer's domain AND have drawn:
        // a frame that never loaded raises no violation either.
        const drawn = await page.waitForFunction((t) => document.querySelector(".pagepv iframe")?.src.startsWith(t),
          TENANT, { timeout: 30000 }).then(() => true, () => false);
        view.preview = await page.locator(".pagepv iframe").first().getAttribute("src").catch(() => null);
        const inner = page.frames().find((f) => f.url().startsWith(TENANT));
        view.previewDrew = !!inner && await inner.waitForSelector(".bk-step-head", { state: "attached", timeout: 20000 }).then(() => true, () => false);
        ok(drawn && view.previewDrew, `preview-from-domain${tag}`, `the preview frame src was ${view.preview} and it ${view.previewDrew ? "drew" : "never drew the booking page"}`);
      }
      if (stripe) {
        view.stripe = await openCardForm(page);
        ok(view.stripe.frames > 0 && view.stripe.loaded, `stripe-card-form${tag}`,
          `Stripe.js ${view.stripe.loaded ? "loaded" : "did NOT load"}, ${view.stripe.frames} Stripe frame(s) in the card box${view.stripe.stuck ? ` (${view.stripe.stuck})` : ""}`);
      }
      await page.waitForTimeout(1500);
      if (ex) {
        // THE SCRIPTS RAN: every <script> on the page is a file, each one
        // answered 200, and none of them threw.
        const tags = await page.evaluate(() => [...document.scripts].map((x) => x.src ? new URL(x.src).pathname : null));
        const bad = tags.filter((t) => t === null || scripts.get(t) !== 200);
        view.scripts = { files: tags.length, bad, errors };
        ok(tags.length > 0 && bad.length === 0 && errors.length === 0, `ex-scripts-ran${tag}`,
          `${tags.length} script(s); ${bad.map((t) => t ?? "INLINE").join(", ") || "none"} not run from a file; page errors: ${errors.join(" | ") || "none"}`);
        // THE FORMS DO NOT SUBMIT: each one is submitted and the page must stay.
        const before = page.url();
        const forms = await page.locator("form").count();
        for (let i = 0; i < forms; i++) await page.locator("form").nth(i).evaluate((f) => f.requestSubmit()).catch(() => {});
        if (forms) await page.waitForTimeout(800);
        view.forms = forms;
        ok(page.url() === before, `ex-forms-stay${tag}`, `${forms} form(s); the page went from ${before} to ${page.url()}`);
      }
      const rel = `${SHOTS}/${((p + (as === "staff" ? "-staff" : "")).replace(/\W+/g, "-").replace(/^-|-$/g, "") || "home")}-${s.w}.png`;
      await page.screenshot({ path: join(REPO, rel) });
      artifacts.push(rel);
      const events = sink.events.filter(ours);
      ok(events.length === 0, `events${tag}`, `${events.length} violation(s): ${events.slice(0, 3).map((e) => `${e.directive} ${e.blocked}`).join(" | ")}`);
      ok(sink.console.length === 0, `console${tag}`, `${sink.console.length} CSP console line(s): ${sink.console.slice(0, 2).join(" | ")}`);
      if (sink.noise.length) warnings.push(`${tag} other console noise (not CSP, not judged here): ${[...new Set(sink.noise)].slice(0, 3).join(" | ")}`);
      observed.views[tag] = { ...view, header: !!header, events: events.length, console: sink.console.length, noise: sink.noise.length };
      await ctx.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

const VIEWS = SIZES.length * PAGES.length;
const SIGNED_IN = PAGES.filter((p) => p.as).length, DOMAIN = PAGES.filter((p) => p.domain).length;
const STRIPE = PAGES.filter((p) => p.stripe).length, EX = PAGES.filter((p) => p.ex).length;
const EXPECTED_ASSERTIONS = 2 + 2 + 2 + 1 + VIEWS * 3 + SIZES.length * (1 + SIGNED_IN + DOMAIN + STRIPE + EX * 2);
ok(assertions === EXPECTED_ASSERTIONS, "assertion-count", `ran ${assertions} assertions, declared ${EXPECTED_ASSERTIONS}`);
assertions--; // the count check itself is not one of the declared assertions
const status = failures.length ? "fail" : "pass";
const reached = Object.keys(observed.views).length;
const { path } = writeReceipt({
  // One file per break, so the second sabotage never overwrites the first.
  check_id: `csp-report-only${AS_ENFORCED ? "-enforced" : ""}${BREAK ? "-" + BREAK : ""}`,
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: VIEWS,
  discovered_targets: reached,
  attempted_targets: reached,
  completed_targets: reached,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  assertion_floor: `2 /book/* header + 2 policy text + 2 built-page scan + 1 canary + ${VIEWS} views x 3 (header, events, console) + 3 sizes x ${1 + SIGNED_IN + DOMAIN + STRIPE + EX * 2} (booking last step, ${SIGNED_IN} signed in, ${DOMAIN} preview from the detailer's domain, ${STRIPE} Stripe card form, ${EX} example pages x 2: scripts ran, forms stay) = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: [
    "Chromium only, against app/dist served with app/netlify.toml's headers by this script — not Netlify itself.",
    `Served as ${NAME}${AS_ENFORCED ? " (--as-enforced: a rehearsal; app/netlify.toml declares " + DECLARED + ")" : ""}. Data-driven image hosts (a detailer's stored logo or photo address) are only seen on the rows the demo tenant has.`,
    "Stripe's card form is drawn from a made-up client secret, so Stripe shows its own error inside the frame; the frames and Stripe.js are real, a card was never typed.",
    ...warnings,
  ],
  artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), pages: PAGES.map((p) => p.path + (p.as ? "~" + p.as : "") + (p.domain ? "+domain" : "")), tenant_domain: TENANT, item: "97.26, 97.90", header: NAME, declared: DECLARED, break: BREAK, origin: A },
  canary: { id: "unlisted-image-host-reported", observed_failure: (observed.canary?.events ?? 0) > 0 && (observed.canary?.console ?? 0) > 0 },
  observed,
});
console.log(JSON.stringify(observed, null, 1));
for (const w of warnings) console.log("WARN " + w);
for (const f of failures) console.log("FAIL " + f);
console.log(`receipt: ${path}`);
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, ${reached} of ${VIEWS} views`);
process.exit(failures.length ? 1 : 0);
