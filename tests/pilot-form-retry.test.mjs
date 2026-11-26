import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire, stripTypeScriptTypes } from "node:module";
import { fileURLToPath } from "node:url";
import { after, before, test } from "node:test";
import { STEPS } from "../app/src/lib/siteIntake.js";

const app = new URL("../app/", import.meta.url);
const require = createRequire(new URL("package.json", app));
const { chromium } = require("playwright");
const api = "http://127.0.0.1:1";
const shots = fileURLToPath(new URL("../artifacts/pilot-form-retry/", import.meta.url));
const business = { id: "fixture-tenant", slug: "pilot-fixture", name: "Pilot Fixture", timezone: "America/Los_Angeles" };
let server, browser, origin;

before(async () => {
  const { createServer } = await import(new URL("node_modules/vite/dist/node/index.js", app));
  process.env.VITE_SUPABASE_URL = api;
  process.env.VITE_SUPABASE_ANON_KEY = "fixture-only";
  const entry = "/__pilot_intake.jsx";
  server = await createServer({
    root: fileURLToPath(app),
    cacheDir: fileURLToPath(new URL("../artifacts/pilot-form-retry/vite", import.meta.url)),
    server: { host: "127.0.0.1", port: 5397, strictPort: true },
    plugins: [{
      name: "pilot-intake-owner-fixture",
      configureServer(vite) {
        vite.middlewares.use(async (req, res, next) => {
          if (req.url !== "/__pilot_intake") return next();
          res.setHeader("Content-Type", "text/html");
          res.end(await vite.transformIndexHtml(req.url,
            `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module" src="${entry}"></script></body></html>`));
        });
      },
      resolveId(id) {
        if (id === entry) return entry;
      },
      load(id) {
        if (id !== entry) return;
        return `
          import React from "react";
          import { createRoot } from "react-dom/client";
          import SiteIntake from "/src/screens/SiteIntake.jsx";
          import "/src/theme.css";
          createRoot(document.getElementById("root")).render(
            React.createElement("div", { className: "app-shell" },
              React.createElement("main", { className: "app-main" }, React.createElement(SiteIntake)))
          );
        `;
      },
      transform(source, id) {
        if (id.replaceAll("\\", "/").endsWith("/src/screens/SiteIntake.jsx")) {
          return source.replace('import { useBusiness } from "../context/BusinessContext.jsx";',
            `const useBusiness = () => ({ business: ${JSON.stringify(business)}, role: "owner" });`);
        }
      },
    }],
  });
  await server.listen();
  origin = server.resolvedUrls.local[0];
  browser = await chromium.launch();
  await mkdir(shots, { recursive: true });
});

after(async () => {
  await browser?.close();
  await server?.close();
});

async function fixturePage(t, viewport, mock) {
  const context = await browser.newContext({ viewport, serviceWorkers: "block", locale: "en-US" });
  t.after(() => context.close());
  const blocked = [];
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === new URL(origin).origin) return route.continue();
    if (url.origin === "https://fonts.googleapis.com" && url.pathname === "/css2") {
      return route.fulfill({ contentType: "text/css", body: "" });
    }
    if (url.origin === api) {
      const headers = {
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET, POST, OPTIONS",
        "access-control-allow-headers": "*",
      };
      if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers });
      const reply = await mock(url.pathname, route.request());
      if (reply?.offline) return route.abort("internetdisconnected");
      if (reply) return route.fulfill({ ...reply, headers });
    }
    blocked.push(url.pathname);
    return route.abort();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (["error", "warning"].includes(message.type()) &&
        !/status of (404|503)|ERR_INTERNET_DISCONNECTED/.test(message.text())) {
      errors.push(message.text());
    }
  });
  t.after(() => {
    assert.deepEqual(blocked, [], "unexpected requests were blocked");
    assert.deepEqual(errors, [], "unexpected browser console errors or warnings");
  });
  return page;
}

async function look(page, state, width, button) {
  await page.keyboard.press("Tab");
  await button.focus();
  assert(await button.evaluate((el) => el.matches(":focus-visible") && getComputedStyle(el).outlineStyle !== "none"));
  assert((await button.boundingBox()).height >= 44, "retry needs a 44px target");
  assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "horizontal overflow");
  await page.screenshot({ path: `${shots}${state}-${width}.png`, fullPage: true });
}

async function receiptLookup(fixture) {
  const source = await readFile(new URL("../supabase/functions/get-booking-receipt/index.ts", import.meta.url), "utf8");
  const js = stripTypeScriptTypes(source.replace(/^import .*;\r?$/gm, "").replace(/^export /gm, ""));
  let handler;
  const query = {
    select: () => query, eq: () => query, is: () => query,
    maybeSingle: async () => fixture,
  };
  new Function("Deno", "supabase", "json", "withinLimits", "LIMITS", "ipOf", js)(
    { serve: (fn) => { handler = fn; } },
    { from: () => query },
    (body, status) => Response.json(body, { status }),
    async () => true, { publicCeiling: {} }, () => "fixture",
  );
  const response = await handler(new Request("http://localhost/receipt?id=fixture"));
  return { status: response.status, json: await response.json() };
}

test("receipt distinguishes a failed database read from a missing booking", async () => {
  assert.deepEqual(await receiptLookup({ error: { code: "57014" } }),
    { status: 503, json: { error: "booking_unavailable" } });
  assert.deepEqual(await receiptLookup({ data: null, error: null }),
    { status: 404, json: { error: "not_found" } });
  assert.equal((await receiptLookup({ error: { code: "22P02" } })).status, 404);
});

const viewports = [{ width: 1440, height: 900 }, { width: 768, height: 1024 }, { width: 390, height: 844 }];

for (const viewport of viewports) {
  test(`Website form keeps answers and waits for a successful retry at ${viewport.width}px`, async (t) => {
    const submissions = [];
    let startAutosave, releaseAutosave, releaseRetry;
    const autosaveStarted = new Promise((resolve) => { startAutosave = resolve; });
    const autosaveResponse = new Promise((resolve) => { releaseAutosave = resolve; });
    const retryResponse = new Promise((resolve) => { releaseRetry = resolve; });
    t.after(() => { releaseAutosave(); releaseRetry(); });
    const page = await fixturePage(t, viewport, async (path, request) => {
      if (path === "/rest/v1/testimonials") return { json: [] };
      if (path !== "/rest/v1/site_intake") return;
      if (request.method() === "GET") return { json: [{ step: STEPS.length - 1, answers: { K3: "Keep the blue truck photo." } }] };
      const payload = request.postDataJSON();
      if (!payload.submitted_at) {
        startAutosave();
        await autosaveResponse;
        return { status: 204 };
      }
      submissions.push(payload);
      if (submissions.length === 1) return { status: 503, json: { message: "fixture save unavailable" } };
      await retryResponse;
      return { status: 204 };
    });
    await page.goto(new URL("__pilot_intake", origin).href);
    const answer = page.locator("textarea").first();
    await answer.fill("Keep the blue truck photo.");
    await answer.fill("Autosave this first.");
    await autosaveStarted;
    await answer.fill("Keep the red truck photo.");
    await page.getByRole("button", { name: "Send it" }).click();
    await page.getByRole("button", { name: "Saving…" }).waitFor();
    assert.equal(submissions.length, 0);
    releaseAutosave();
    await page.getByRole("alert").getByText("Could not save that. Try again.").waitFor();
    assert.equal(await answer.inputValue(), "Keep the red truck photo.");
    assert.equal(await page.getByText(/saved automatically/).count(), 0);
    const sent = page.getByRole("heading", { name: "Sent. We will start building." });
    assert.equal(await sent.count(), 0);
    const retry = page.getByRole("button", { name: "Try again" });
    await look(page, "intake-retry", viewport.width, retry);
    await retry.click();
    await page.getByRole("button", { name: "Saving…" }).waitFor();
    assert.equal(await sent.count(), 0);
    releaseRetry();
    await sent.waitFor();
    assert.deepEqual(submissions.map(({ answers }) => answers.K3), Array(2).fill("Keep the red truck photo."));
  });

  test(`Manage Booking retries transient errors and keeps missing links terminal at ${viewport.width}px`, async (t) => {
    let calls = 0;
    let reply = "unavailable";
    const id = "11111111-1111-4111-8111-111111111111";
    const page = await fixturePage(t, viewport, async (path, request) => {
      if (path === "/rest/v1/rpc/get_public_business_profile") return { json: { business } };
      if (path !== "/functions/v1/get-booking-receipt") return;
      if (request.postDataJSON().id !== id) return { status: 404, json: { error: "not_found" } };
      calls++;
      if (reply === "unavailable") return { status: 503, json: { error: "booking_unavailable" } };
      if (reply === "offline") return { offline: true };
      return { json: { business, booking: {
        id, status: "confirmed", start_at: "2030-08-12T17:00:00Z", end_at: "2030-08-12T19:00:00Z",
        service_type: "mobile", services: [], add_ons: [], total_price: 65,
      } } };
    });
    await page.goto(new URL(`booking/${id}`, origin).href);
    const transient = page.getByRole("heading", { name: "Could not load your booking" });
    const missing = page.getByRole("heading", { name: "Booking not found" });
    const retry = page.getByRole("button", { name: "Try again" });
    await transient.waitFor();
    assert.equal(await missing.count(), 0);
    await look(page, "booking-retry", viewport.width, retry);
    const initialCalls = calls;
    reply = "offline";
    await retry.click();
    await transient.waitFor();
    assert.equal(calls, initialCalls + 1);
    reply = "ready";
    await retry.click();
    await page.getByRole("heading", { name: "Pilot Fixture" }).waitFor();
    assert.equal(calls, initialCalls + 2);
    await page.goto(new URL("booking/missing-fixture", origin).href);
    await missing.waitFor();
    assert.equal(await retry.count(), 0);
  });
}
