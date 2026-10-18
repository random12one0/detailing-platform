// ROADMAP 97.13 — "Your web address" still adds and verifies an address end to end, once the browser
// may no longer write `business_domains` and a pass needs the row's own DNS token.
//
//   set -a; . ./.env; set +a          # DEMO_OWNER_PW (or ENV_FILE=<path to .env>)
//   BASE_URL=http://127.0.0.1:5180 node scripts/web-address-proof.mjs
//   ... --break=old-screen            # run against the PRE-97.13 screen (git stash/checkout it first);
//                                     # its receipt lands in receipts/web-address-proof.sabotage.json
//
// NOTHING IS WRITTEN TO ANY DATABASE. It signs in as the demo owner and then answers every
// `business_domains` read and every `verify-domain` call itself (page.route), playing the database AFTER
// migration 20261018010000: a direct INSERT/UPDATE from the browser is refused with Postgres's own
// "permission denied", and the function adds the row and answers the check — first "not yet" (the TXT
// record does not hold the token), then "verified". The server half is proved elsewhere
// (`tests/domain-proof.test.mjs`, `tests/domain-claims-sql.test.mjs`); this proves the SCREEN uses it.
//
// Per width, 9 questions: add went through the function · no direct write · the row appears · the DNS
// box names the TXT record · and shows THIS row's token · a refused check says why and is not Live ·
// a passing check says live · the Live mark shows · no console error and no sideways scroll.
// Plus 2 canaries (a wrong token and a synthetic direct write must each be caught by the same predicate).

import { createRequire } from "node:module";
import { mkdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const envFile = process.env.ENV_FILE || join(REPO, ".env");
if (!process.env.DEMO_OWNER_PW && existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*(DEMO_OWNER_PW)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const BASE = (process.env.BASE_URL || process.env.BASE || "http://localhost:5173").replace(/\/$/, "");
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const SHOTS = process.env.SHOT_DIR || join(REPO, ".manager-shots", "97.13");
const FREEZE = process.env.FREEZE || null;           // "before" | "after": write Andrew's review copy at 390
const FREEZE_TOOL = "C:/Users/rando/Downloads/claude/belt/freeze.mjs";
const FREEZE_DIR = "C:/Users/rando/Downloads/claude/belt/shots/97.13";
mkdirSync(SHOTS, { recursive: true });

const SIZES = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }, { w: 320, h: 700 }];
const PER_WIDTH = 9;
const SEED = { id: "dddddddd-0000-4000-8000-000000000001", domain: "book.coastlineautodetailing.example",
  verification_token: "5eedc0de5eedc0de5eedc0de5eedc0de", verified_at: null, created_at: "2026-10-01T00:00:00Z" };
const TYPED = "https://Book.Coastline-Proof.example/";
const ADDED = "book.coastline-proof.example";
const TOKEN = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const REASON = `${ADDED} reaches us, but the TXT record _detailing-platform.${ADDED} does not hold this address's code yet.`;

// The predicates, used by the run AND the canaries, so a canary exercises exactly what the run asserts.
const showsToken = (text, token) => text.includes("_detailing-platform.book") && text.includes(token);
const noDirectWrite = (writes) => writes.length === 0;

async function signIn(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", demoOwnerEmail ?? "demo@detailplatform.com");
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  const state = await ctx.storageState();
  await ctx.close();
  return state;
}

async function one(browser, state, size, failures, observed) {
  const ctx = await browser.newContext({ storageState: state, viewport: { width: size.w, height: size.h } });
  const page = await ctx.newPage();
  const rows = [{ ...SEED }];
  const fnCalls = [], directWrites = [], consoleErrors = [];
  let checks = 0;
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(String(e)));

  await page.route("**/rest/v1/business_domains**", async (route) => {
    const req = route.request();
    if (req.method() === "GET" || req.method() === "HEAD") {
      // The screen's own read asks for the token; every other reader only wants verified hosts.
      const body = req.url().includes("verification_token") ? rows : rows.filter((r) => r.verified_at).map((r) => ({ domain: r.domain }));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    }
    if (req.method() === "DELETE") return route.fulfill({ status: 204, body: "" });
    directWrites.push(`${req.method()} ${req.url()}`);
    return route.fulfill({ status: 403, contentType: "application/json",
      body: JSON.stringify({ code: "42501", message: "permission denied for table business_domains" }) });
  });
  await page.route("**/functions/v1/verify-domain", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, body: "" });
    const body = JSON.parse(route.request().postData() || "{}");
    fnCalls.push(body);
    if (body.action === "add") {
      const added = { id: "dddddddd-0000-4000-8000-000000000002", domain: ADDED, verification_token: TOKEN, verified_at: null, created_at: "2026-10-17T00:00:00Z" };
      rows.push(added);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ added }) });
    }
    checks++;
    if (checks === 1) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ verified: false, reason: REASON }) });
    const r = rows.find((x) => x.id === body.domain_id);
    if (r) r.verified_at = "2026-10-17T00:05:00Z";
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ verified: true, domain: r?.domain }) });
  });

  const ask = (name, ok, detail = "") => { observed.push(`${size.w}: ${ok ? "ok  " : "FAIL"} ${name}`); if (!ok) failures.push(`${size.w}x${size.h}: ${name}${detail ? ` — ${detail}` : ""}`); };

  await page.goto(`${BASE}/app?settings=domain`, { waitUntil: "domcontentloaded" });
  const input = page.getByPlaceholder("e.g. book.yourdetailing.com");
  await input.waitFor({ timeout: 30000 });
  await page.locator(".row-item").first().waitFor({ timeout: 15000 });

  if (FREEZE && size.w === 390) {
    const { freeze } = await import(pathToFileURL(FREEZE_TOOL).href);
    mkdirSync(FREEZE_DIR, { recursive: true });
    await freeze(page, {
      out: `${FREEZE_DIR}/${FREEZE}.html`,
      label: FREEZE === "before" ? "Before" : "After",
      note: FREEZE === "before"
        ? "The DNS box asks for one record only. Nothing ties the address to this business, so any address that points at the platform could be marked live."
        : "The DNS box now asks for a second record, a TXT with this address's own code. Only the person who controls the address can add it, and Check it passes only when it is there.",
      highlight: ".sunken",
    });
  }

  await input.fill(TYPED);
  await page.getByRole("button", { name: "Add this address" }).click();
  await page.waitForTimeout(1200);
  const adds = fnCalls.filter((c) => c.action === "add");
  ask("adding goes through verify-domain (action add)", adds.length === 1 && adds[0].domain != null,
    `function calls: ${JSON.stringify(fnCalls)}`);
  ask("no direct INSERT/UPDATE on business_domains from the browser", noDirectWrite(directWrites), directWrites.join(", "));
  const newRow = page.locator(".row-item", { hasText: ADDED });
  ask("the added address appears in the list", await newRow.count() === 1);

  const box = page.locator(".sunken", { hasText: ADDED });
  const boxText = (await box.count()) ? await box.first().textContent() : "";
  ask("the DNS box names the TXT record _detailing-platform.book", boxText.includes("TXT") && boxText.includes("_detailing-platform.book"), boxText.slice(0, 200));
  ask("the DNS box shows THIS row's token", showsToken(boxText, TOKEN), boxText.slice(0, 200));
  if (await box.count()) await box.first().scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(SHOTS, `web-address-${size.w}-added.png`), fullPage: true });

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  if (await newRow.count()) {
    await newRow.getByRole("button", { name: "Check it" }).click();
    await page.waitForTimeout(1200);
    const err = (await page.locator(".error-box").allTextContents()).join(" ");
    ask("a refused check says why, and the row is not Live", err.includes("does not hold this address") && !(await newRow.textContent()).includes("Live"), err);
    await newRow.getByRole("button", { name: "Check it" }).click();
    await page.waitForTimeout(1500);
    const ok = (await page.locator(".ok-box").allTextContents()).join(" ");
    ask("a passing check says the address is live", ok.includes(`${ADDED} is live`), ok);
    ask("the row now carries the Live mark", await page.locator(".row-item", { hasText: ADDED }).locator(".pill.completed").count() === 1);
  } else {
    ask("a refused check says why, and the row is not Live", false, "no row to check");
    ask("a passing check says the address is live", false, "no row to check");
    ask("the row now carries the Live mark", false, "no row to check");
  }
  await page.screenshot({ path: join(SHOTS, `web-address-${size.w}-live.png`), fullPage: true });
  ask("no console error and no sideways scroll", consoleErrors.length === 0 && overflow <= 0,
    `overflow ${overflow}px; console: ${consoleErrors.slice(0, 3).join(" | ")}`);
  await ctx.close();
}

async function run() {
  const served = await (await fetch(`${BASE}/src/screens/more/WebAddress.jsx`)).text();
  const isNew = served.includes("addDomain");
  if (BREAK === "old-screen" ? isNew : !isNew) {
    console.error(`The served WebAddress.jsx ${isNew ? "IS" : "is NOT"} the 97.13 screen, which is not what ${BREAK ? `--break=${BREAK}` : "a clean run"} needs. NOTHING WAS MEASURED.`);
    process.exit(2);
  }
  const browser = await chromium.launch();
  const failures = [], observed = [];
  const state = await signIn(browser);
  let completed = 0;
  for (const size of SIZES) { await one(browser, state, size, failures, observed); completed++; }
  await browser.close();

  const canaries = [
    { id: "wrong-token", observed_failure: !showsToken(`TXT _detailing-platform.book ${SEED.verification_token}`, TOKEN) },
    { id: "direct-write", observed_failure: !noDirectWrite(["POST /rest/v1/business_domains"]) },
  ];
  const assertions = SIZES.length * PER_WIDTH;
  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: "web-address-proof",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length, discovered_targets: SIZES.length, attempted_targets: SIZES.length,
    completed_targets: completed, skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: SIZES.length * PER_WIDTH,
    assertion_floor: `${SIZES.length} widths x ${PER_WIDTH} questions, fixed by the question list (docs/gotchas.md 98).`,
    failures,
    warnings: [
      "Every business_domains read and every verify-domain answer is played by page.route; nothing reaches the database. "
      + "It proves the SCREEN uses the function and shows the token, not that the deployed function or the applied migration exist.",
    ],
    artifacts: SIZES.flatMap((s) => ["added", "live"].map((k) => `${SHOTS.replace(REPO + "\\", "").replace(/\\/g, "/")}/web-address-${s.w}-${k}.png`)),
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), item: "97.13", break: BREAK, served_new_screen: isNew },
    canary: { id: "wrong-token+direct-write", observed_failure: canaries.every((c) => c.observed_failure) },
    canaries, observed,
  });
  console.log(observed.join("\n"));
  console.log(`receipt: ${path}`);
  console.log(`\n${status.toUpperCase()} — ${assertions} assertions over ${completed} of ${SIZES.length} widths, ${failures.length} failed`);
  failures.forEach((f) => console.log(`  FAIL ${f}`));
  process.exit(failures.length ? 1 : 0);
}

run().catch((e) => { console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass."); process.exit(2); });
