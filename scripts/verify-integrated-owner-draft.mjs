// Build with VITE_SUPABASE_URL=https://stand-in.supabase.invalid and a fictional anon key.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { chromium } from "../app/node_modules/playwright/index.mjs";
import { ownerDraft } from "../supabase/functions/_shared/ownerDraftAccess.js";
import { fixture, shop } from "../tests/fixtures/pilotGemini.mjs";
const root = path.resolve("app/dist"),
  shots = path.join(tmpdir(), "dp-owner-draft-" + randomUUID());
await mkdir(shots);
const api = "https://stand-in.supabase.invalid";
const type = {
  ".js": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".png": "image/png",
  ".webmanifest": "application/manifest+json",
};
const server = createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (!path.extname(p)) p = "/index.html";
  const file = path.resolve(root, "." + p);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const data = await readFile(file);
    res
      .writeHead(200, {
        "content-type": type[path.extname(file)] ?? "application/octet-stream",
      })
      .end(data);
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ channel: "chrome", headless: true });
const owner = randomUUID(),
  business = randomUUID(),
  wrongOwner = randomUUID(),
  wrongShop = randomUUID();
const jwt = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
try {
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1440, 900],
    [320, 820],
  ]) {
    const ctx = await browser.newContext({
        viewport: { width, height },
        reducedMotion: "reduce",
        serviceWorkers: "block",
      }),
      f = fixture();
    const page = await ctx.newPage();
    page.setDefaultTimeout(7000);
    let identity = owner,
      tenant = business,
      role = "owner",
      mode = "off",
      rev = 0,
      logout = false;
    const records = new Map(),
      errors = [],
      writes = [],
      foreign = [];
    const user = () => ({
      id: identity,
      role: "authenticated",
      aud: "authenticated",
      email: "fixture@example.invalid",
      user_metadata: {},
      app_metadata: {},
      created_at: "2026-01-01T00:00:00Z",
    });
    const expiry = Math.floor(Date.now() / 1000) + 86400;
    const session = () => ({
      user: user(),
      access_token: [
        jwt({ alg: "HS256", typ: "JWT" }),
        jwt({ sub: identity, role: "authenticated", exp: expiry }),
        "fixture",
      ].join("."),
      refresh_token: "fictional-refresh",
      token_type: "bearer",
      expires_in: 86400,
    });
    page.on("pageerror", (e) => errors.push(e.message));
    const consoleErrors = [];
    page.on("console", (m) => {
      if (m.type() === "error" || m.type() === "warning")
        consoleErrors.push(m.text());
    });
    await ctx.route("**/*", async (route) => {
      const rq = route.request(),
        u = new URL(rq.url());
      if (u.origin === base) return route.continue();
      if (u.origin !== api) {
        if (!["fonts.googleapis.com", "fonts.gstatic.com"].includes(u.host))
          foreign.push(u.origin);
        return route.fulfill({ status: 200, body: "" });
      }
      const respond = (data, status = 200) =>
        route.fulfill({
          status,
          contentType: "application/json",
          headers: { "access-control-allow-origin": base },
          body: JSON.stringify(data),
        });
      const p = u.pathname;
      if (p.endsWith("/token")) return respond(session());
      if (p.endsWith("/user")) return respond(user());
      if (p.endsWith("/logout")) {
        logout = true;
        return respond({});
      }
      if (p.endsWith("/owner-draft")) {
        const resp = await ownerDraft(
          new Request(base + p, {
            method: "POST",
            headers: {
              origin: base,
              authorization: rq.headers().authorization,
            },
            body: rq.postData(),
          }),
          {
            flags: {
              origin: base,
              enabled: "1",
              owner,
              business,
              ai: mode,
              secret: f.secret,
            },
            requireMember: async () =>
              rq.headers().authorization?.includes(session().access_token)
                ? { userId: identity, businessId: tenant, role }
                : null,
            markedPreview: async () => false,
            storeFor: () => ({
              read: async (k) => structuredClone(records.get(k)),
              create: async (k, value) => {
                if (records.has(k)) return false;
                records.set(k, { value });
                return true;
              },
              save: async (k, value, r) => {
                if (r !== rev) return false;
                rev++;
                records.set(k, { value: structuredClone(value) });
                return true;
              },
            }),
            send: f.deps.send,
            now: f.deps.clock,
            json: (d, status = 200) => Response.json(d, { status }),
            preflight: () => new Response(),
          },
        );
        return respond(await resp.json(), resp.status);
      }
      if (p.endsWith("/get_public_business_profile"))
        return respond({
          business: {
            id: business,
            slug: "fictional",
            name: "Fictional Booking Shop",
            status: "active",
          },
          settings: {
            dropoff_enabled:
              JSON.parse(rq.postData()).p_slug === "fictional-open",
          },
          services: [
            {
              id: randomUUID(),
              name: "Fictional inside wash",
              base_price: 100,
              duration_minutes: 60,
            },
          ],
          branding: {},
        });
      if (
        rq.method() !== "GET" &&
        rq.method() !== "HEAD" &&
        !p.includes("/rpc/") &&
        !p.endsWith("/track-visit")
      )
        writes.push(rq.method() + " " + p);
      if (p.includes("/rest/v1/")) {
        const name = p.split("/").at(-1),
          row =
            name === "business_users"
              ? {
                  business_id: tenant,
                  role,
                  permissions: [],
                  businesses: { name: "Fixture" },
                }
              : name === "businesses"
                ? {
                    id: tenant,
                    slug: "fixture",
                    name: "Fictional Setup Shop",
                    status: "paused",
                    awaiting_first_payment: true,
                  }
                : name === "business_settings"
                  ? {
                      business_id: tenant,
                      setup: { seen: true, dismissed: true },
                    }
                  : null;
        return respond(
          (rq.headers().accept ?? "").includes("vnd.pgrst.object")
            ? row
            : row
              ? [row]
              : [],
        );
      }
      return respond({});
    });
    const btn = (name, scope = page) =>
      scope.getByRole("button", { name, exact: true });
    const login = async () => {
      await page.locator('input[type="email"]').fill("fixture@example.invalid");
      await page.locator('input[type="password"]').fill("fictional-passphrase");
      await btn("Sign in").click();
    };
    const shot = async (label) => {
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        label + " overflow",
      );
      await page.screenshot({
        animations: "disabled",
        path: path.join(shots, label + "-" + width + ".png"),
      });
    };
    try {
      await page.goto(base + "/app?onboarding=1");
      await btn("Sign in").waitFor();
      await login();
      const form = page.locator(".shop-questions");
      await form.getByRole("heading", { name: "Business details" }).waitFor();
      await shot("shop");
      const chapter = async (name) => {
        const d = form.locator(".sq-index details");
        if (!(await d.evaluate((e) => e.open)))
          await d.locator("summary").click();
        await btn(name, d).click();
      };
      await form.getByLabel("Business name").fill(shop.name);
      await chapter("Services and packages");
      await form
        .getByLabel("Describe your services and packages")
        .fill(shop.menu_notes);
      await chapter("Vehicle sizes and pricing");
      await form
        .getByLabel("Describe your vehicle sizes and prices")
        .fill(shop.size_details);
      await shot("sizes");
      await chapter("Cancellations and rescheduling");
      await form
        .getByLabel("Describe your cancellation and rescheduling policy")
        .fill(shop.policy_notes);
      await chapter("Existing website");
      await form.getByLabel("Website address").fill("https://juniper.example");
      await btn("Review setup", form).click();
      await btn("Save draft on this device", form).click();
      await form
        .getByText("Draft saved on this device.", { exact: true })
        .waitFor();
      await page.reload();
      await form.getByLabel("Business name").waitFor();
      assert.equal(
        await form.getByLabel("Business name").inputValue(),
        shop.name,
      );
      await btn("Website draft").click();
      const website = page.getByRole("textbox", {
        name: "Your current website",
      });
      await website.waitFor();
      assert.match(await website.inputValue(), /juniper/);
      await website.fill("https://edited.example");
      await btn("Save website draft").click();
      await page
        .getByRole("status")
        .filter({ hasText: "Draft saved on this device." })
        .first()
        .waitFor();
      await btn("Shop setup").click();
      await btn("Website draft").click();
      await website.waitFor();
      assert.match(await website.inputValue(), /edited/);
      await btn("AI Settings").click();
      await page
        .getByText("AI is off. You can fill out and save your draft.")
        .waitFor();
      await shot("settings");
      if (width === 390) {
        mode = "enabled";
        await btn("Shop setup").click();
        await btn("AI Settings").click();
        const key = page.getByLabel("Provider API key");
        await key.fill("AI" + "za" + "x".repeat(35));
        await page
          .getByRole("button", { name: /Save key and load models/ })
          .click();
        await page.getByLabel("Available models").fill("gemini-3.8-flash");
        await btn("Test and use model").click();
        await page.getByText(/Current model.*gemini-3.8-flash/).waitFor();
        await btn("Shop setup").click();
        await btn("Review setup", form).click();
        await btn("Review what AI will receive", form).click();
        await btn("Send these answers to AI", form).click();
        await btn("Add suggestions to my draft", form).click();
        await btn("Save draft on this device", form).click();
        await form
          .getByText("Draft saved on this device.", { exact: true })
          .waitFor();
        const saved = await page.evaluate(
          ([o, b]) =>
            JSON.parse(localStorage.getItem("dp.ownerSetup.v1." + o + "." + b)),
          [owner, business],
        );
        assert.equal(saved.size_mode, "purchase");
        assert.equal(saved.vehicle_sizes[1].fee, 15);
        assert.equal(saved.cancellation_window_hours, undefined);
        await page.getByRole("link", { name: "Back to dashboard" }).click();
        await page
          .getByRole("heading", { name: "Finish payment to go live" })
          .waitFor();
        await page.goto(base + "/app?onboarding=1");
        await btn("Sign out").click();
        await btn("Sign in").waitFor();
        assert.ok(logout);
        identity = wrongOwner;
        await login();
        await page
          .getByRole("heading", { name: "This setup link is unavailable." })
          .waitFor();
        assert.equal(await form.count(), 0);
        identity = owner;
        tenant = wrongShop;
        await page.reload();
        await page
          .getByRole("heading", { name: "This setup link is unavailable." })
          .waitFor();
        await page.goto(base + "/book/fictional");
        await page
          .getByRole("heading", {
            name: /Fictional Booking Shop.*taking bookings online yet/,
          })
          .waitFor();
        await page.goto(base + "/book/fictional-open");
        await page
          .getByRole("heading", { name: "Fictional Booking Shop", exact: true })
          .waitFor();
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(writes, []);
      assert.deepEqual(foreign, []);
      const unexpected = consoleErrors.filter(
        (m) =>
          !/404|font|WebSocket|realtime|websocket|Service Worker registration blocked/i.test(
            m,
          ),
      );
      assert.deepEqual(unexpected, []);
      console.log(
        width +
          "px passed (" +
          consoleErrors.length +
          " console entries examined)",
      );
    } catch (e) {
      console.error(
        (await page.locator("body").innerText()).slice(0, 850),
        errors,
        writes,
        consoleErrors.slice(-4),
      );
      throw e;
    } finally {
      await ctx.close();
    }
  }
  console.log("Synthetic browser screenshots: " + shots);
} finally {
  await browser.close();
  await new Promise((ok) => server.close(ok));
}
