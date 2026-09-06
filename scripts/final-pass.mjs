// ROADMAP 7.3 — the final end-to-end pass, as a BRAND-NEW business and as
// STAFF.
//
//   node scripts/final-pass.mjs            # make the fixture, walk it, shoot
//   node scripts/final-pass.mjs --keep     # leave the fixture behind
//
// Needs the dev server and the root `.env` (service role). It creates its own
// throwaway tenant on the PLATFORM project — never the owner's live business —
// and deletes it again unless told not to.
//
// ---------------------------------------------------------------------------
// WHY IT IS A NEW BUSINESS AND NOT THE DEMO. Every other browser script in
// this repo drives `demo-detail`, which has 31 bookings, 13 customers, six
// services, four plans and a subscription. **The state a real detailer meets
// on their first morning is the opposite of that**, and CLAUDE.md already says
// so about the walkthrough: *"the empty dashboard is the state to verify
// against, not the seeded demo — the opposite of every other screen in this
// rebuild."* A screen that is beautiful with data and blank with none is a
// screen nobody has ever seen the way its first user will.
//
// AND STAFF IS THE OTHER HALF, for the same reason: roadmap 2.13 gave a
// non-owner member a label and four permission ticks, and the rail, the gear
// and half a dozen rows change shape underneath them. Nothing has ever walked
// that as a browser.
// ---------------------------------------------------------------------------

import { readFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

for (const line of readFileSync(new URL("../.env", import.meta.url), "utf8").split(/\r?\n/)) {
  const i = line.indexOf("=");
  if (i < 1 || line.trim().startsWith("#")) continue;
  const k = line.slice(0, i).trim();
  if (!process.env[k]) process.env[k] = line.slice(i + 1).trim();
}

const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE || "http://localhost:5173";
const OUT = process.env.OUT || "shots-final";
const KEEP = process.argv.includes("--keep");
if (!URL_ || !SERVICE) { console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing"); process.exit(1); }

const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json" };
const api = async (path, init = {}) => {
  const r = await fetch(`${URL_}${path}`, { ...init, headers: { ...H, Prefer: "return=representation", ...(init.headers ?? {}) } });
  const body = await r.text();
  if (!r.ok) throw new Error(`${path}: ${r.status} ${body}`);
  return body ? JSON.parse(body) : null;
};

const SLUG = "final-pass-fixture";
const OWNER = { email: "final-owner@detailplatform.com", password: `Aa1!${Math.random().toString(36).slice(2)}` };
const STAFF = { email: "final-staff@detailplatform.com", password: `Aa1!${Math.random().toString(36).slice(2)}` };

// ── the fixture ────────────────────────────────────────────────────────────
async function userFor({ email, password }) {
  await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: H, body: JSON.stringify({ email, password, email_confirm: true }),
  });
  const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const u = (all.users ?? []).find((x) => x.email === email);
  if (!u) throw new Error(`could not create ${email}`);
  await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, {
    method: "PUT", headers: H, body: JSON.stringify({ password, email_confirm: true }),
  });
  return u.id;
}

async function teardown() {
  await api(`/rest/v1/businesses?slug=eq.${SLUG}`, { method: "DELETE" }).catch(() => {});
  // THE ACCOUNTS TOO. Deleting the business leaves two orphaned logins behind,
  // and a login nobody remembers creating is exactly the credential CLAUDE.md
  // refuses to leave lying around for the platform admin.
  const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  for (const u of all.users ?? []) {
    if (u.email === OWNER.email || u.email === STAFF.email) {
      await fetch(`${URL_}/auth/v1/admin/users/${u.id}`, { method: "DELETE", headers: H }).catch(() => {});
    }
  }
}

await teardown();
const [business] = await api("/rest/v1/businesses", {
  method: "POST",
  body: JSON.stringify([{
    slug: SLUG, name: "Final Pass Detailing", timezone: "America/Los_Angeles",
    contact_email: OWNER.email, is_demo: true,
  }]),
});
// EXACTLY WHAT `_shared/newBusiness.ts` GIVES A NEW BUSINESS, and nothing
// else. Seeding one service here would be seeding away the very state this
// script exists to look at.
await api("/rest/v1/business_settings", { method: "POST", body: JSON.stringify([{ business_id: business.id }]) });
await api("/rest/v1/business_branding", { method: "POST", body: JSON.stringify([{ business_id: business.id }]) });
await api("/rest/v1/business_hours", {
  method: "POST",
  body: JSON.stringify([
    ...[1, 2, 3, 4, 5].map((weekday) => ({ business_id: business.id, weekday, open_time: "09:00", close_time: "17:00" })),
    ...[0, 6].map((weekday) => ({ business_id: business.id, weekday, open_time: null, close_time: null })),
  ]),
});

const ownerId = await userFor(OWNER);
const staffId = await userFor(STAFF);
await api("/rest/v1/business_users", {
  method: "POST",
  body: JSON.stringify([
    // PostgREST refuses a batch whose objects have different keys, so the
    // owner row carries the same two columns with nulls rather than omitting
    // them — an owner has no label and no ticks by design (`role = 'owner'`
    // means everything, roadmap 2.13).
    { business_id: business.id, user_id: ownerId, email: OWNER.email, role: "owner",
      // `permissions` is NOT NULL with a default; an explicit null is not the
      // same as omitting it, which is what the first version got wrong.
      label: null, permissions: [] },
    // A REAL STAFF SHAPE RATHER THAN A BLANK ONE: a named role with two of the
    // four ticks, which is what a detailer actually hands a washer.
    { business_id: business.id, user_id: staffId, email: STAFF.email, role: "staff",
      label: "Washer", permissions: ["requests"] },
  ]),
});
console.log(`fixture: ${business.name} (${SLUG})  owner=${OWNER.email}  staff=${STAFF.email}\n`);

// ── the walk ───────────────────────────────────────────────────────────────
mkdirSync(OUT, { recursive: true });
const notes = [];
const browser = await chromium.launch();

// THE FIRST RUN IS CONSUMED BY LOOKING AT IT, and the first version of this
// script did not notice. An owner's first-run gate is
// `business_settings.setup.seen` — a DATABASE row shared by every walk — while
// staff's is `localStorage`, which a fresh Playwright context clears by
// itself. So walk one saw the setup form, marked it seen, and walks two, three
// and four reported "no tour on a brand-new account" about an account that was
// no longer brand new. **The script was measuring its own footprints**, which
// is the same shape as everything else in this repo's history: a check that
// silently stops having a subject.
async function resetFirstRun() {
  await api(`/rest/v1/business_settings?business_id=eq.${business.id}`, {
    method: "PATCH",
    body: JSON.stringify({ setup: { done: [], seen: false, dismissed: false } }),
  });
}

async function walk(who, creds, width) {
  if (who === "owner") await resetFirstRun();
  const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 844 : 900 } });
  const page = await ctx.newPage();
  const errs = [];
  page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  page.on("pageerror", (e) => errs.push(String(e)));

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", creds.email);
    await page.fill("input[type=password]", creds.password);
    await page.click("form button.btn.primary");
  }
  await page.waitForSelector(".tabbar", { timeout: 30000 });
  await page.waitForTimeout(2500);

  // THE SETUP FORM IS WHAT AN OWNER MEETS FIRST — not a screen, a form. It
  // takes the main area rather than floating over it, and this is the only
  // script in the repo that arrives at it the way a real detailer does
  // (`sweep-widths.mjs` opens it from the Business row, which is the SECOND
  // way in and does not lead to the tour).
  const setup = page.locator(".setupfoot");
  if (await setup.count()) {
    await page.screenshot({ path: `${OUT}/${who}-${width}-setup.png` });
    const heading = (await page.evaluate(() => document.querySelector(".app-main")?.innerText ?? ""))
      .split(/\n/).slice(0, 3).join(" · ");
    notes.push(`${who} @${width}: the setup form opens first — "${heading}"`);
    // ALL SEVEN, and the first version clicked once. "I'll do this later"
    // ADVANCES A STEP — it is not a way out of the form — so one click left
    // the walk on step 2, and the tab click that followed dismissed the form
    // by NAVIGATING AWAY. That is a real path a detailer takes and it is
    // written up in `docs/final-pass.md`; it is not the path this script
    // should walk, because it skips the tour that the finished form leads to.
    // It never presses Continue, which is the button that writes.
    for (let step = 0; step < 8; step++) {
      const later = page.getByRole("button", { name: "I'll do this later" });
      if (!(await later.count())) break;
      await later.click();
      await page.waitForTimeout(650);
    }
    await page.waitForTimeout(900);
  } else if (who === "owner") {
    notes.push(`${who} @${width}: NO SETUP FORM on a brand-new account`);
  }

  // THE TOUR IS WAITING, AND THAT IS THE FIRST FINDING OF THE PASS RATHER THAN
  // an obstacle to it: a brand-new business meets the guided walkthrough
  // before it meets any screen, and every other browser script in this repo
  // drives an account that dismissed it long ago. It is photographed, then
  // skipped — which is also the path a detailer in a hurry takes.
  const tour = page.locator(".tourblock");
  if (await tour.count()) {
    await page.screenshot({ path: `${OUT}/${who}-${width}-tour.png` });
    const caption = (await tour.first().innerText()).split(/\n/).slice(0, 2).join(" · ");
    notes.push(`${who} @${width}: the tour opens unprompted — "${caption}"`);
    await page.getByRole("button", { name: "Skip the tour" }).click();
    await page.waitForTimeout(900);
  } else {
    notes.push(`${who} @${width}: NO TOUR on a brand-new account`);
  }

  // WHICH TABS EXIST IS ITSELF A FINDING. Staff get three and an owner five
  // (`TAB_NEEDS` in App.jsx); reading them rather than assuming is what makes
  // this script able to report a rail that changed by accident.
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll(".tabbar button")].map((b) => b.textContent.trim()));
  notes.push(`${who} @${width}: rail = ${tabs.join(", ")}`);

  for (const tab of tabs) {
    await page.getByRole("button", { name: tab, exact: true }).first().click();
    await page.waitForTimeout(1400);
    const shot = `${OUT}/${who}-${width}-${tab.toLowerCase().replace(/\W+/g, "")}.png`;
    await page.screenshot({ path: shot });
    // AN EMPTY SCREEN WITH NOTHING TO SAY IS THE DEFECT THIS PASS IS LOOKING
    // FOR, so the amount of text on it is recorded rather than eyeballed.
    const text = (await page.evaluate(() => document.querySelector(".app-main")?.innerText ?? "")).trim();
    notes.push(`${who} @${width}: ${tab} — ${text.length} chars, first line "${text.split("\n")[0] ?? ""}"`);
  }

  // The gear, which both roles have.
  const gear = page.locator("button[aria-pressed]").first();
  if (await gear.count()) {
    await gear.click();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${who}-${width}-gear.png` });
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".nav-row")].map((r) => r.innerText.split("\n")[0]));
    notes.push(`${who} @${width}: gear = ${rows.join(", ") || "(no rows)"}`);
  }

  if (errs.length) notes.push(`${who} @${width}: CONSOLE — ${[...new Set(errs)].join(" | ")}`);
  await ctx.close();
}

for (const width of [392, 1440]) {
  await walk("owner", OWNER, width);
  await walk("staff", STAFF, width);
}
await browser.close();

console.log(notes.join("\n"));
if (!KEEP) { await teardown(); console.log(`\nfixture removed. --keep leaves it.`); }
else console.log(`\nfixture kept: ${OWNER.email} / ${OWNER.password}  ·  ${STAFF.email} / ${STAFF.password}`);
