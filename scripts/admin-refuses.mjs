// ROADMAP 12.4 — `/admin` LETS IN EXACTLY THE ROSTER, AND REFUSES EVERYONE ELSE.
//
//   set -a; . ./.env; set +a
//   node scripts/admin-refuses.mjs                # dev server on :5173
//   node scripts/admin-refuses.mjs --break=let-in # sabotage: the server says "admin" to the staff login
//
// WHAT IT ASKS, per signed-in account (the demo owner and the demo staff
// login) and per width (1440, 392, 320), each in a fresh browser context:
//   - the gear menu draws "The website business" row  iff the account is on the roster;
//   - `/admin` opens the back office (`.pa-top`)        iff the account is on the roster,
//     and otherwise the product's own 404 (`main.nf`) — never both, never neither;
//   - the console holds nothing but the designed `platform-admin` 404 lines
//     (docs/gotchas.md 120) for an account that is refused.
//
// **THE EXPECTATION COMES FROM `docs/platform-admins.md`, NEVER FROM THE TABLE.**
// Today both demo logins are deliberate admins or deliberate non-admins (ROADMAP
// 0.1), so this run shows the owner admitted and the staff login refused. The day
// 12.4 is carried out and `demo@detailplatform.com` leaves the roster, the SAME
// run expects that login refused with no edit here — which is the half of 12.4's
// done-when ("`/admin` refuses whatever remains of the old pair") nothing had ever
// loaded in a browser. `tests/platform-admins-declared.test.mjs` keeps the roster
// and the table agreeing; this keeps the roster and the SCREEN agreeing.
//
// THE SABOTAGE IS THE DEFECT IT GUARDS. `--break=let-in` answers every
// `platform-admin` call the staff login makes with a 200 `{admin:true}`, which is
// a gate that lets a non-admin through. It must go red, and it must prove the
// route was hit before either colour is believed (docs/gotchas.md 102).
//
// It writes nothing to the database. Twelve sign-ins and a handful of
// `platform-admin` reads.

import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));

const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
if (BREAK && BREAK !== "let-in") { console.error(`unknown --break=${BREAK}; the only one is let-in`); process.exit(2); }
if (!(process.env.SUPABASE_URL || "").includes("kguqylyzgyzfktkfnhjb")) {
  console.error("SUPABASE_URL is not the platform's own project (kguqylyzgyzfktkfnhjb) — run `set -a; . ./.env; set +a`.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

// The same named fence `tests/platform-admins-declared.test.mjs` parses.
const roster = (() => {
  const m = /```declared-platform-admins\r?\n([\s\S]*?)```/.exec(readFileSync(join(REPO, "docs/platform-admins.md"), "utf8"));
  return m ? m[1].split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean) : null;
})();

const ACCOUNTS = [
  { label: "owner", ...demoOwner() },
  { label: "staff", ...demoStaff() },
].map((a) => ({ ...a, admin: !!roster?.includes(a.email.toLowerCase()) }));
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 720 }];
const ROW = "The website business";
const PER_TARGET = 3; // gear row, /admin verdict, console
// roster parsed + accounts x widths x 3 + 2 canaries, asserted as an EQUALITY (gotchas 98).
const EXPECTED_ASSERTIONS = 1 + ACCOUNTS.length * SIZES.length * PER_TARGET + 2;

const failures = [], observed = [], sabotage = [];
let assertions = 0;
const ok = (cond, name, detail) => {
  assertions++;
  const line = `${cond ? "PASS" : "FAIL"} ${name} — ${detail}`;
  console.log(line);
  observed.push(line);
  if (!cond) failures.push(`${name}: ${detail}`);
};

// THE RULE, pure so the canaries bite the production rule. Exactly one of the
// two screens, or the answer is "neither" — a blank page is not a refusal.
const verdict = ({ admitted, refused }) =>
  admitted && !refused ? "admitted" : refused && !admitted ? "refused" : "neither";

ok(Array.isArray(roster) && roster.length > 0, "roster/parsed",
  roster ? `${roster.length} declared; owner ${ACCOUNTS[0].admin ? "on" : "off"} it, staff ${ACCOUNTS[1].admin ? "on" : "off"} it` : "no declared-platform-admins block");

const browser = await chromium.launch();
try {
  for (const acct of ACCOUNTS) {
    for (const { w, h } of SIZES) {
      const tag = `${acct.label}/${w}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const noise = [];
      page.on("console", (m) => {
        if (m.type() === "error" || m.type() === "warning") noise.push({ text: m.text(), url: m.location()?.url || "" });
      });
      const calls = [];
      page.on("request", (r) => {
        if (r.method() === "POST" && r.url().includes("/functions/v1/platform-admin")) calls.push(r);
      });

      let hits = 0;
      if (BREAK && !acct.admin) {
        await ctx.route("**/functions/v1/platform-admin", async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          hits++;
          await route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" },
            body: JSON.stringify({ admin: true, email: acct.email, rows: [], totals: {} }) });
        });
      }

      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
      if (await page.locator("input[type=email]").count()) {
        await page.fill("input[type=email]", acct.email);
        await page.fill("input[type=password]", acct.password);
        await page.click("form button.btn.primary");
        await page.waitForSelector(".tabbar", { timeout: 30000 });
      }

      // The gear: settle on the REQUEST, never on the rendering (gotchas 109).
      await page.click('button[data-tour="gear"]');
      await page.waitForSelector('button[aria-label="Close settings"]', { timeout: 15000 });
      await page.waitForTimeout(1200);
      await Promise.all(calls.map((r) => r.response()));
      await page.waitForTimeout(600);
      const rowShown = (await page.locator(`text=${ROW}`).count()) > 0;
      ok(rowShown === acct.admin, `${tag}/gear-row-${acct.admin ? "drawn" : "absent"}`, `"${ROW}" shown: ${rowShown}`);

      // /admin: `attached`, not the default `visible` (gotchas 107).
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".pa-top, main.nf", { state: "attached", timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(800);
      const seen = { admitted: (await page.locator(".pa-top").count()) > 0, refused: (await page.locator("main.nf").count()) > 0 };
      const v = verdict(seen);
      const want = acct.admin ? "admitted" : "refused";
      ok(v === want, `${tag}/admin-${want}`, `screen: ${v} (back office ${seen.admitted}, 404 ${seen.refused})`);

      const designed = noise.filter((c) => c.url.includes("/functions/v1/platform-admin") && /404/.test(c.text));
      const other = noise.filter((c) => !designed.includes(c));
      ok(other.length === 0 && (acct.admin ? designed.length === 0 : true), `${tag}/console`,
        `${designed.length} designed platform-admin 404 line(s), ${other.length} other`
        + (other.length ? `: ${other.slice(0, 3).map((c) => c.text).join(" | ")}` : ""));

      if (BREAK && !acct.admin) {
        sabotage.push({ tag, route_hits: hits });
        if (hits === 0) {
          console.error(`SABOTAGE DID NOT TAKE at ${tag}: the route was never hit. This run proves nothing (gotchas 102).`);
          process.exitCode = 3;
        }
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

// ── THE CANARIES, aimed at `verdict` itself ─────────────────────────────────
const c1 = verdict({ admitted: true, refused: true });
ok(c1 !== "refused" && c1 !== "admitted", "canary/both-screens", `both drawn must read as neither, got ${c1}`);
const c2 = verdict({ admitted: false, refused: false });
ok(c2 !== "refused", "canary/blank-page", `nothing drawn must NOT read as a refusal, got ${c2}`);

if (assertions !== EXPECTED_ASSERTIONS) {
  failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS} — a run that never reached a width`);
}

const targets = ACCOUNTS.length * SIZES.length;
const status = failures.length ? "fail" : "pass";
const { path } = writeReceipt({
  check_id: "admin-refuses",
  started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
  status,
  expected_targets: targets,
  discovered_targets: targets,
  attempted_targets: targets,
  completed_targets: targets,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: EXPECTED_ASSERTIONS,
  assertion_floor: `1 roster + 2 accounts x 3 widths x ${PER_TARGET} + 2 canaries = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: [
    "The expectation is the roster in docs/platform-admins.md, not the table. tests/platform-admins-declared.test.mjs is what keeps those two agreeing; run it beside this.",
    "demo@demo.com is not signed in here: its password is Andrew's and no session holds it. It is covered only by the roster test.",
    "Dev server only; the published bundle is not measured.",
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), accounts: ACCOUNTS.map((a) => `${a.label}:${a.admin ? "admin" : "refused"}`), item: "12.4", break: BREAK },
  canary: { id: "both-screens+blank-page", observed_failure: c1 === "neither" && c2 === "neither" },
  sabotage, observed,
});
console.log(`receipt: ${path}`);
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
if (failures.length && !process.exitCode) process.exitCode = 1;
