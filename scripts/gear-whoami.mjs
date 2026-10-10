// ROADMAP 9.17 — THE GEAR ASKS `platform-admin` WHO YOU ARE ONCE PER PAGE, AND
// A NON-ADMIN STILL GETS A 404.
//
//   set -a; . ./.env; set +a
//   node scripts/gear-whoami.mjs                     # dev server on :5173
//   node scripts/gear-whoami.mjs --break=late-cache  # sabotage: the pre-fix cache, restored in the page
//
// WHAT IT ASKS, per account (staff = a non-admin, owner = a platform admin) and
// per width (1440, 392, 320), each in a fresh browser context so the page-level
// cache starts empty:
//   - the FIRST gear open makes exactly ONE `platform-admin` POST — not two.
//     The dev server runs React.StrictMode, which mounts the menu's effect
//     twice; the pre-fix cache was written after the answer, so both mounts
//     asked (item 9.17 measured 2 on the dev server, 1 on the bundle);
//   - the second and third opens make ZERO;
//   - the staff call is a 404 and the back-office row is not drawn; the owner's
//     is a 200 and the row is drawn — the case that should work, beside the
//     one that should be refused;
//   - the console holds nothing but that one designed 404 line, counted by URL,
//     for staff, and nothing at all for the owner.
// And, with no browser: `platform-admin` `whoami` answers a non-admin AND an
// anonymous caller with a 404 whose body says nothing about admins — never
// `{admin:false}`, which would make a silent endpoint confirm itself. That is
// ROADMAP 9.17 (b), asked of the DEPLOYED function, not of its source
// (`tests/platform-admin.test.mjs` § 7 already reads the source).
//
// THE SABOTAGE IS THE ORIGINAL DEFECT. `--break=late-cache` rewrites the served
// GearMenu module so the cache is written only after the answer arrives —
// the shape it had before this item — and requires the rewrite to SIGN itself
// in the page before either colour is believed (docs/gotchas.md 102 and 113:
// an edit that silently missed, or a rewrite that was served but not run,
// prints an ordinary clean run). One `goto` per context, for the same reason.
//
// It writes nothing to the database and spends no budget beyond six sign-ins
// and nine edge-function calls.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoStaff } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)(join(REPO, "app/node_modules/playwright/index.js"));

const BASE = process.env.BASE_URL || "http://localhost:5173";
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
if (BREAK && BREAK !== "late-cache") { console.error(`unknown --break=${BREAK}; the only one is late-cache`); process.exit(2); }

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
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }, { w: 320, h: 720 }];
const OPENS = 3;
// Per account x width: first-open-one-call, reopens-zero, status, row, console = 5.
const PER_RUN = 5;
// Live: staff 404, anonymous 404, owner 200 = 3. Canaries = 2.
const EXPECTED_ASSERTIONS = ACCOUNTS.length * SIZES.length * PER_RUN + 3 + 2;
const ROW = "The website business";
const ART = join(REPO, ".manager-shots", "9.17");
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
// A non-admin answer is right only if it is a 404 that names nothing.
const silentRefusal = ({ status, text }) => status === 404 && !/admin/i.test(text);
// The first open is right only at exactly one call: zero means the check saw nothing.
const askedOnce = (n) => n === 1;

// ── (b) the deployed function, no browser ─────────────────────────────────
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

// ── (a) and (c) in the browser ────────────────────────────────────────────
const browser = await chromium.launch();
try {
  for (const acct of ACCOUNTS) {
    for (const { w, h } of SIZES) {
      const tag = `${acct.label}/${w}`;
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
        let landed = 0;
        await page.route("**/src/components/GearMenu.jsx*", async (route) => {
          const res = await route.fetch();
          const body = await res.text();
          const needle = "adminSeen = { uid, ask };";
          landed = body.split(needle).length - 1;
          const out = body.replace(needle, "await ask; adminSeen = { uid, ask }; globalThis.__gearBreak = true;");
          await route.fulfill({ response: res, body: out, headers: { ...res.headers(), "cache-control": "no-store" } });
        });
        sabotage.push({ tag, get landed() { return landed; } });
      }

      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
      if (await page.locator("input[type=email]").count()) {
        await page.fill("input[type=email]", acct.email);
        await page.fill("input[type=password]", acct.password);
        await page.click("form button.btn.primary");
        await page.waitForSelector(".tabbar", { timeout: 30000 });
      }

      const perOpen = [];
      for (let i = 0; i < OPENS; i++) {
        const before = calls.length;
        await page.click('button[data-tour="gear"]');
        await page.waitForSelector('button[aria-label="Close settings"]', { timeout: 15000 });
        // Settle on the REQUEST, never on the rendering (gotchas 109): wait for
        // every call this open started to answer, then a quiet second for a
        // sibling that left late.
        await page.waitForTimeout(1200);
        await Promise.all(calls.slice(before).map((r) => r.response()));
        await page.waitForTimeout(800);
        perOpen.push(calls.length - before);
        if (i === 0) {
          const shot = join(ART, `${acct.label}-${w}.png`);
          await page.screenshot({ path: shot });
          artifacts.push(`.manager-shots/9.17/${acct.label}-${w}.png`);
        }
        if (i < OPENS - 1) {
          await page.click('button[aria-label="Close settings"]');
          await page.waitForSelector('button[data-tour="gear"]', { timeout: 15000 });
        }
      }

      if (BREAK) {
        const signed = await page.evaluate(() => globalThis.__gearBreak === true);
        const s = sabotage[sabotage.length - 1];
        sabotage[sabotage.length - 1] = { tag, landed: s.landed, ran: signed };
        if (s.landed !== 1 || !signed) {
          console.error(`SABOTAGE DID NOT TAKE at ${tag}: replaced ${s.landed}, ran ${signed}. This run proves nothing (gotchas 102, 113).`);
          process.exitCode = 3;
        }
      }

      const statuses = await Promise.all(calls.map(async (r) => (await r.response())?.status() ?? null));
      const rowShown = (await page.locator(`text=${ROW}`).count()) > 0;
      ok(askedOnce(perOpen[0]), `${tag}/first-open-asks-once`, `${perOpen[0]} platform-admin call(s) on the first open`);
      ok(perOpen.slice(1).every((n) => n === 0), `${tag}/reopens-ask-nothing`, `opens 2..${OPENS}: ${perOpen.slice(1).join(", ")}`);
      const want = acct.admin ? 200 : 404;
      ok(statuses.length > 0 && statuses.every((s) => s === want), `${tag}/answer-is-${want}`, `statuses ${JSON.stringify(statuses)}`);
      ok(rowShown === acct.admin, `${tag}/back-office-row-${acct.admin ? "drawn" : "absent"}`, `row "${ROW}" shown: ${rowShown}`);
      const designed = console_.filter((c) => c.url.includes("/functions/v1/platform-admin") && /404/.test(c.text));
      const other = console_.filter((c) => !designed.includes(c));
      const wantDesigned = acct.admin ? 0 : 1;
      ok(designed.length === wantDesigned && other.length === 0, `${tag}/console`,
        `${designed.length} designed platform-admin 404 line(s) (want ${wantDesigned}), ${other.length} other`
        + (other.length ? `: ${other.slice(0, 3).map((c) => c.text).join(" | ")}` : ""));

      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

// ── THE CANARIES ──────────────────────────────────────────────────────────
const c1 = silentRefusal({ status: 200, text: '{"admin":false}' });
ok(!c1, "canary/admin-false", "a 200 `{admin:false}` must NOT read as a silent refusal");
const c2 = askedOnce(2);
ok(!c2, "canary/two-calls", "two calls on a first open (the pre-fix dev server) must NOT read as once");

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
  assertion_floor: `2 accounts x 3 widths x ${PER_RUN} + 3 live + 2 canaries = ${EXPECTED_ASSERTIONS}, asserted as an EQUALITY (docs/gotchas.md 98).`,
  failures,
  warnings: [
    "Dev server only. The production bundle has no StrictMode and made 1 call before this fix (ROADMAP 9.17's table); it is not re-measured here.",
    "The one staff 404 console line is DESIGNED and cannot be removed from JavaScript: Chrome logs every 4xx a fetch receives, and platform-admin must answer 404 rather than {admin:false}. docs/gotchas.md records it as expected noise.",
  ],
  artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), accounts: ACCOUNTS.map((a) => a.label), opens: OPENS, item: "9.17", break: BREAK },
  canary: { id: "admin-false+two-calls", observed_failure: !c1 && !c2 },
  sabotage, observed,
});
console.log(`receipt: ${path}`);
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
if (failures.length && !process.exitCode) process.exitCode = 1;
