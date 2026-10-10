// ROADMAP 99.3a — THE SETTINGS GEAR HAS NO BACK-OFFICE ROW, FOR ANYBODY, AND
// OPENING IT ASKS `platform-admin` NOTHING.
//
//   set -a; . ./.env; set +a
//   node scripts/gear-whoami.mjs              # dev server on :5173
//   node scripts/gear-whoami.mjs --break=ask  # sabotage: the old door, put back in the page
//
// HISTORY. Until 2026-10-10 this script held ROADMAP 9.17: the gear asked
// `whoami` once per page and drew "The website business" row for a platform
// admin, and a non-admin's console carried one designed 404. Andrew ruled in
// 99.3 that the row comes out and he reaches the back office by typing /admin,
// so the question went with it. The old assertions (exactly one call, one 404)
// would now fail only because the thing they tested was deleted; they are in
// git history at 2095185b.
//
// WHAT IT ASKS, per account (staff = a non-admin, owner = a platform admin) and
// per width (1440, 392, 320, and 392 under ?lite=1), each in a fresh context:
//   - the gear index drew its rows (a DISCOVERY FLOOR: a gear that never opened
//     must not read as a gear with no row in it);
//   - three opens make ZERO `platform-admin` POSTs;
//   - no row keyed "platform", and no "The website business" text;
//   - the console holds no error or warning at all — the 404 line gotchas 120
//     used to forgive here is gone with the question that caused it.
// And, with no browser, the server's secrecy rule 99.3 keeps (its plan step 7):
// `whoami` answers a non-admin AND an anonymous caller with a 404 whose body
// says nothing about admins, and the owner with a 200. That is what /admin
// itself still relies on to show "Page not found".
//
// THE SABOTAGE IS THE OLD DOOR. `--break=ask` rewrites the served GearMenu
// module to make a `whoami` POST on mount and to draw a "platform" row, and
// SIGNS itself in the page; a run where the rewrite did not land or did not run
// exits 3 and proves nothing (docs/gotchas.md 102 and 113). One `goto` per
// context for the same reason.
//
// It writes nothing to the database: eight sign-ins and three edge-function calls.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));

const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
if (BREAK && BREAK !== "ask") { console.error(`unknown --break=${BREAK}; the only one is ask`); process.exit(2); }

const { SUPABASE_URL, SUPABASE_ANON_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}
if (!SUPABASE_URL.includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not the platform's own project (kguqylyzgyzfktkfnhjb). Stopping.");
  process.exit(2);
}

const ACCOUNTS = [
  { label: "staff", admin: false, ...demoStaff() },
  { label: "owner", admin: true, ...demoOwner() },
];
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 720 }, { w: 392, h: 844, lite: true }];
const OPENS = 3;
// The fewest rows any account's gear draws (staff: mail, templates, password,
// device, report). A floor, not an equality: a new row is not a fault.
const MIN_ROWS = 5;
// Per account x size: rows drawn, asks nothing, row absent, console = 4.
const PER_RUN = 4;
// Live: staff 404, anonymous 404, owner 200 = 3. Canaries = 2.
const EXPECTED_ASSERTIONS = ACCOUNTS.length * SIZES.length * PER_RUN + 3 + 2;
const ROW = "The website business";
const ART = join(REPO, ".manager-shots", "99.3");
mkdirSync(ART, { recursive: true });

const failures = [], observed = [], artifacts = [], sabotage = [];
let assertions = 0;
const ok = (cond, name, detail) => {
  assertions++;
  const line = `${cond ? "PASS" : "FAIL"} ${name} — ${detail}`;
  console.log(line);
  observed.push(line);
  if (!cond) failures.push(`${name}: ${detail}`);
};

// THE RULES, as pure functions so the canaries bite the production rule.
const silentRefusal = ({ status, text }) => status === 404 && !/admin/i.test(text);
const asksNothing = (perOpen) => perOpen.length === OPENS && perOpen.every((n) => n === 0);

// ── the deployed function, no browser ─────────────────────────────────────
async function signIn({ email, password }) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error(`sign-in failed for ${email}: ${r.status}`);
  return j.access_token;
}
async function whoami(bearer) {
  const r = await fetch(`${SUPABASE_URL}/functions/v1/platform-admin`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "whoami" }),
  });
  return { status: r.status, text: await r.text() };
}
{
  const staff = await whoami(await signIn(ACCOUNTS[0]));
  ok(silentRefusal(staff), "live/staff-gets-a-silent-404", `${staff.status} ${staff.text.slice(0, 80)}`);
  const anon = await whoami(SUPABASE_ANON_KEY);
  ok(silentRefusal(anon), "live/anonymous-gets-a-silent-404", `${anon.status} ${anon.text.slice(0, 80)}`);
  const owner = await whoami(await signIn(ACCOUNTS[1]));
  // Body not printed: it carries the admin's email.
  ok(owner.status === 200 && /"admin":\s*true/.test(owner.text), "live/owner-gets-200-admin-true", `${owner.status}`);
}

// ── the gear, in the browser ──────────────────────────────────────────────
const browser = await chromium.launch();
try {
  for (const acct of ACCOUNTS) {
    for (const { w, h, lite } of SIZES) {
      const tag = `${acct.label}/${w}${lite ? "-lite" : ""}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const console_ = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") console_.push({ text: m.text(), url: m.location()?.url || "" });
      });
      const calls = [];
      page.on("request", (r) => {
        if (r.method() === "POST" && r.url().includes("/functions/v1/platform-admin")) calls.push(r);
      });

      if (BREAK) {
        const s = { tag, landed: 0, ran: false };
        sabotage.push(s);
        await page.route("**/src/components/GearMenu.jsx*", async (route) => {
          const res = await route.fetch();
          let body = await res.text();
          const ask = /( {4}load\(\);\r?\n {2}\}, \[load\]\);)/;
          const row = "].filter(([, , , , needs])";
          s.landed = (ask.test(body) ? 1 : 0) + (body.split(row).length - 1);
          body = body
            .replace(ask, `    globalThis.__gearBreak = true; fetch(${JSON.stringify(SUPABASE_URL + "/functions/v1/platform-admin")}, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "whoami" }) }).catch(() => {});\n$1`)
            .replace(row, `].concat([["platform", ${JSON.stringify(ROW)}, Bell, "x", null]]).filter(([, , , , needs])`);
          await route.fulfill({ response: res, body, headers: { ...res.headers(), "cache-control": "no-store" } });
        });
      }

      await page.goto(`${BASE}/app${lite ? "?lite=1" : ""}`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
      if (await page.locator("input[type=email]").count()) {
        await page.fill("input[type=email]", acct.email);
        await page.fill("input[type=password]", acct.password);
        await page.click("form button.btn.primary");
        await page.waitForSelector(".tabbar", { timeout: 30000 });
      }

      const perOpen = [];
      let rows = 0, platformRow = false;
      for (let i = 0; i < OPENS; i++) {
        const before = calls.length;
        await page.click('button[data-tour="gear"]');
        await page.waitForSelector('button[aria-label="Close settings"]', { timeout: 15000 });
        // Settle on the REQUEST, never on the rendering (gotchas 109): a quiet
        // window long enough for the old ask (one round trip), then wait out
        // anything that did leave.
        await page.waitForTimeout(1500);
        await Promise.all(calls.slice(before).map((r) => r.response()));
        perOpen.push(calls.length - before);
        if (i === 0) {
          rows = await page.locator(".nav-row[data-settings-key]").count();
          platformRow = (await page.locator('.nav-row[data-settings-key="platform"]').count()) > 0
            || (await page.locator(`text=${ROW}`).count()) > 0;
          const shot = join(ART, `gear-${acct.label}-${w}${lite ? "-lite" : ""}.png`);
          await page.screenshot({ path: shot });
          artifacts.push(`.manager-shots/99.3/gear-${acct.label}-${w}${lite ? "-lite" : ""}.png`);
        }
        if (i < OPENS - 1) {
          await page.click('button[aria-label="Close settings"]');
          await page.waitForSelector('button[data-tour="gear"]', { timeout: 15000 });
        }
      }

      if (BREAK) {
        const s = sabotage[sabotage.length - 1];
        s.ran = await page.evaluate(() => globalThis.__gearBreak === true);
        if (s.landed !== 2 || !s.ran) {
          console.error(`SABOTAGE DID NOT TAKE at ${tag}: needles replaced ${s.landed} of 2, ran ${s.ran}. This run proves nothing (gotchas 102, 113).`);
          process.exitCode = 3;
        }
      }

      ok(rows >= MIN_ROWS, `${tag}/gear-drew-its-rows`, `${rows} rows (floor ${MIN_ROWS})`);
      ok(asksNothing(perOpen), `${tag}/gear-asks-nothing`, `platform-admin calls per open: ${perOpen.join(", ")}`);
      ok(!platformRow, `${tag}/no-back-office-row`, `row keyed "platform" or "${ROW}" shown: ${platformRow}`);
      ok(console_.length === 0, `${tag}/console-silent`,
        `${console_.length} error/warning line(s)` + (console_.length ? `: ${console_.slice(0, 3).map((c) => c.text).join(" | ")}` : ""));

      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

// ── THE CANARIES ──────────────────────────────────────────────────────────
const c1 = silentRefusal({ status: 200, text: '{"admin":false}' });
ok(!c1, "canary/admin-false", "a 200 `{admin:false}` must NOT read as a silent refusal");
const c2 = asksNothing([1, 0, 0]);
ok(!c2, "canary/one-call", "one call on the first open (the old gear) must NOT read as asking nothing");

if (assertions !== EXPECTED_ASSERTIONS) {
  failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a run that never reached a width`);
}

const targets = ACCOUNTS.length * SIZES.length;
const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "gear-whoami",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: targets,
  discovered_targets: targets,
  attempted_targets: targets,
  completed_targets: targets,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  assertion_floor: `2 accounts x 4 sizes x ${PER_RUN} + 3 live + 2 canaries = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: [
    "Dev server only; the published bundle is not measured. The bundle still has the row until Andrew publishes.",
    "/admin itself still asks whoami and a non-admin's console there shows one designed 404 (docs/gotchas.md 120); scripts/admin-refuses.mjs holds that screen, not this.",
  ],
  artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}${s.lite ? "-lite" : ""}`), accounts: ACCOUNTS.map((a) => a.label), opens: OPENS, item: "99.3a", break: BREAK },
  canary: { id: "admin-false+one-call", observed_failure: !c1 && !c2 },
  sabotage, observed,
});
console.log(`receipt: ${path}`);
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
if (failures.length && !process.exitCode) process.exitCode = 1;
