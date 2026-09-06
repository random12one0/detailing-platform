// TWO DETAILERS, TWO BROWSERS, AT THE SAME TIME — `docs/testing/LOOP.md` §5.
//
// That file is blunt about why this is its own pass and not a checkbox:
//
//   *"`seed-two-tenants.mjs` exists and `tenant-isolation` covers the API.
//   What has never been done is two detailers signed in, in two browsers, at
//   the same time."*
//
// **The gap is real and it is not about row-level security.** `tenant-isolation`
// proves the DATABASE refuses A's rows to B. It cannot see a leak that happens
// after the database was right: a total computed over a list that was fetched
// before a switch, a count left in a React state, a customer name in a cache
// keyed by nothing, a chart drawn from stale props. Every one of those is a
// screen showing one detailer another detailer's business while the server
// behaved perfectly, and **a leak here is the only defect in this product that
// ends it. Everything else is a bad morning.**
//
//   node --env-file=.env scripts/two-detailers.mjs
//   node --env-file=.env scripts/two-detailers.mjs --headed
//
// Needs the dev server and `node scripts/seed-two-tenants.mjs` first. Two
// browser CONTEXTS, not two tabs: a tab shares localStorage and a session with
// its neighbour, which is the thing being tested, so testing it in one context
// would be testing nothing.

import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const HEADED = process.argv.includes("--headed");

let passed = 0, failed = 0;
const check = (name, cond, detail = "") => {
  if (cond) { passed++; console.log(`  ok    ${name}`); }
  else { failed++; console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`); }
};

// THE TWO TENANTS, AND THE TWO LOGINS THE SEED DOES NOT MAKE.
//
// **`seed-two-tenants.mjs` creates no owner ACCOUNTS** — it writes two
// businesses with a `contact_email`, which is a place to send a booking
// alert and not a way to sign in. So the seed for §5's mandatory pass could
// not produce the state §5 requires, which is a large part of why the pass
// had never been run. Rather than change that seed (it is driven by other
// scripts that want exactly the businesses it makes), this creates the two
// memberships it needs, idempotently, the way `final-pass.mjs` does.
//
// Reading the SLUGS out of the seed rather than retyping them: a rename there
// would otherwise leave this script measuring one business twice, and it
// would pass every check in it.
const seed = readFileSync(new URL("./seed-two-tenants.mjs", import.meta.url), "utf8");
const slugs = [...seed.matchAll(/slug: "([a-z0-9-]+)"/g)].map((m) => m[1]).slice(0, 2);
if (slugs.length < 2) {
  console.error("Could not read two slugs out of seed-two-tenants.mjs.");
  process.exit(1);
}
const pw = `Aa1!${"loop"}-two-detailers`;

// EVERY WORD ONE TENANT OWNS AND THE OTHER MUST NEVER SHOW. Names, slugs and
// customer names, pulled from the database rather than guessed: a hardcoded
// list is a list that goes stale the first time the seed changes, and a stale
// list of forbidden words is a check that passes by having no subjects.
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const q = async (p) => (await (await fetch(`${URL_}/rest/v1/${p}`, { headers: H })).json());

const tenants = [];
for (const slug of slugs) {
  const [b] = await q(`businesses?slug=eq.${slug}&select=id,name`);
  if (!b) { console.error(`No business "${slug}" — run: node scripts/seed-two-tenants.mjs`); process.exit(1); }

  // An owner account for this tenant, made here because the seed makes none.
  // Reset the password every run: the account may survive from a previous lap
  // with a different one, and a sign-in that silently fails would make every
  // isolation check below pass by measuring a login screen.
  const email = `${slug}-owner@loop.test`;
  await fetch(`${URL_}/auth/v1/admin/users`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pw, email_confirm: true }),
  });
  const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=200`, { headers: H })).json();
  const user = (all.users ?? []).find((u) => u.email === email);
  if (!user) { console.error(`could not create ${email}`); process.exit(1); }
  await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, {
    method: "PUT", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify({ password: pw, email_confirm: true }),
  });
  await fetch(`${URL_}/rest/v1/business_users?business_id=eq.${b.id}&user_id=eq.${user.id}`,
    { method: "DELETE", headers: H });
  await fetch(`${URL_}/rest/v1/business_users`, {
    method: "POST", headers: { ...H, "Content-Type": "application/json" },
    body: JSON.stringify([{ business_id: b.id, user_id: user.id, role: "owner", email }]),
  });

  const customers = await q(`customers?business_id=eq.${b.id}&select=name,phone,email`);
  const services = await q(`services?business_id=eq.${b.id}&select=name`);
  const bookings = await q(`bookings?business_id=eq.${b.id}&select=customer_name,total_price&limit=50`);
  tenants.push({
    slug, id: b.id, name: b.name, email,
    // THE PEOPLE, KEPT SEPARATE FROM THE MARKERS. `words` below is "anything
    // that identifies this tenant" and correctly includes their service
    // names, which is what makes the leak check wide. But a service name
    // BELONGS on a public booking page, so the check that no CUSTOMER ever
    // reaches one has to be asked of the people alone. Conflating them made
    // that check fail on a page that was behaving perfectly, which is a
    // false alarm and the fastest way to teach somebody to skip a run.
    people: [...new Set([
      ...customers.map((c) => c.name),
      ...customers.map((c) => c.phone).filter(Boolean),
      ...customers.map((c) => c.email).filter(Boolean),
      ...bookings.map((r) => r.customer_name),
    ])].filter((w) => w && String(w).length >= 5),
    // A word only counts as a marker if it is DISTINCTIVE. "Detail" appears
    // in both business names and in the product's own copy; matching on it
    // would report a leak on every screen and the check would stop being read.
    words: [...new Set([
      b.name,
      ...customers.map((c) => c.name),
      ...customers.map((c) => c.phone).filter(Boolean),
      ...bookings.map((r) => r.customer_name),
      // Service names are the tenant's own words and are drawn on Business,
      // on the booking page and inside every job record — the widest surface
      // either tenant has. Without them the seeded pair offers ONE marker
      // each (its name), and one marker is a check that can only find the
      // crudest possible leak.
      ...services.map((s) => s.name),
    ])].filter((w) => w && String(w).length >= 5),
  });
}

// Anything in BOTH tenants tells us nothing — a shared customer name, or a
// word the product itself uses — so it is dropped from both lists.
const shared = tenants[0].words.filter((w) => tenants[1].words.includes(w));
for (const t of tenants) t.words = t.words.filter((w) => !shared.includes(w));

console.log(`A = ${tenants[0].name} (${tenants[0].words.length} markers)`);
console.log(`B = ${tenants[1].name} (${tenants[1].words.length} markers)`);
if (!tenants[0].words.length || !tenants[1].words.length) {
  console.error("One tenant has no distinctive markers — this run would pass by having nothing to look for.");
  process.exit(1);
}

const browser = await chromium.launch({ headless: !HEADED });

const settle = async (page, cap = 8000) => {
  const until = Date.now() + cap;
  while (Date.now() < until) {
    await page.waitForTimeout(120);
    const busy = await page.evaluate(() =>
      !!document.querySelector(".spinner, .bk-spinner, [data-loading]")
      || document.getAnimations().some((a) => a.playState === "running"
        && a.effect?.getTiming?.().iterations !== Infinity));
    if (!busy) return;
  }
};

const signIn = async (ctx, email) => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  // The tab guides fire on a browser that has not seen them and swallow every
  // click after the first — CLAUDE.md records three scripts broken by exactly
  // this. Seed them as seen: this run measures data, not first impressions.
  await page.evaluate(() => {
    localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "money", "clients", "business"]));
    localStorage.setItem("dp.tour", "1");
  });
  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", pw);
  await page.click("form button.btn.primary");
  await page.waitForTimeout(2500);
  await settle(page);
  return page;
};

const TABS = ["Today", "Calendar", "Money", "Clients", "Business"];

// WHAT IS ON THE SCREEN, INCLUDING WHAT IS NOT VISIBLE. `innerText` skips
// anything `display:none` or `opacity:0`, and a leak inside a collapsed panel
// is still a leak — it is one keystroke from being read, and it is in the
// bundle either way. `textContent` sees all of it.
const wordsOn = async (page, words) => page.evaluate((ws) => {
  const t = document.body.textContent || "";
  return ws.filter((w) => t.includes(w));
}, words);

try {
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const A = await signIn(ctxA, tenants[0].email);
  const B = await signIn(ctxB, tenants[1].email);

  console.log("\n1. both signed in at once, each on their own business");
  for (const [page, me, label] of [[A, tenants[0], "A"], [B, tenants[1], "B"]]) {
    const brand = await page.locator(".brand").first().textContent().catch(() => "");
    check(`${label} is signed into ${me.name}`, (brand || "").trim() === me.name, `saw "${brand}"`);
  }

  console.log("\n2. every tab, in both browsers, with the other one live");
  for (const [page, me, them, label] of [
    [A, tenants[0], tenants[1], "A"],
    [B, tenants[1], tenants[0], "B"],
  ]) {
    for (const tab of TABS) {
      const btn = page.locator(`button:has-text("${tab}")`).last();
      if (!(await btn.count())) { console.log(`  --    ${label} has no ${tab} tab`); continue; }
      await btn.click();
      await page.waitForTimeout(700);
      await settle(page);
      const found = await wordsOn(page, them.words);
      check(`${label} · ${tab} shows nothing of ${them.name}`, found.length === 0, found.join(", "));
      // AND THE POSITIVE HALF, WHICH IS WHAT STOPS THIS PASSING VACUOUSLY: a
      // screen that failed to load shows neither tenant's words and would
      // report clean on every check above it. At least one screen has to
      // prove it is really rendering this tenant's data.
      if (tab === "Clients") {
        const mine = await wordsOn(page, me.words);
        check(`${label} · Clients really is showing ${me.name}'s people`, mine.length > 0,
          "the screen is empty — every isolation check above it measured nothing");
      }
    }
  }

  console.log("\n3. A writes while B is looking at the same screen");
  {
    // B parks on Clients. A adds a customer with a word nobody has ever used.
    const marker = `Zzyx${Date.now().toString().slice(-6)}`;
    await B.locator('button:has-text("Clients")').last().click();
    await B.waitForTimeout(600);
    await settle(B);

    const res = await fetch(`${URL_}/rest/v1/customers`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json", Prefer: "return=representation" },
      body: JSON.stringify([{ business_id: tenants[0].id, name: marker, phone: "555-0000" }]),
    });
    const [made] = res.ok ? await res.json() : [null];
    check("A's new customer was created", !!made, `${res.status}`);

    if (made) {
      // B REFRESHES — the cheapest possible way for a leak to arrive, and the
      // one a cache would show. B must never see it, before or after.
      await B.reload({ waitUntil: "domcontentloaded" });
      await B.waitForTimeout(2000);
      await settle(B);
      await B.locator('button:has-text("Clients")').last().click();
      await B.waitForTimeout(900);
      await settle(B);
      const seen = await wordsOn(B, [marker]);
      check("B never sees it, even after a reload", seen.length === 0, seen.join(", "));

      // And A does — the positive half again. A check that "B cannot see it"
      // is worth nothing if nobody can.
      await A.locator('button:has-text("Clients")').last().click();
      await A.waitForTimeout(900);
      await settle(A);
      const mineSeen = await wordsOn(A, [marker]);
      check("and A does", mineSeen.length > 0,
        "if A cannot see their own new customer either, the check above proved nothing");
      await fetch(`${URL_}/rest/v1/customers?id=eq.${made.id}`, { method: "DELETE", headers: H });
    }
  }

  console.log("\n4. the booking pages, side by side and public");
  {
    const pubA = await ctxA.newPage();
    const pubB = await ctxB.newPage();
    await pubA.goto(`${BASE}/book/${tenants[0].slug}`, { waitUntil: "domcontentloaded" });
    await pubB.goto(`${BASE}/book/${tenants[1].slug}`, { waitUntil: "domcontentloaded" });
    await pubA.waitForTimeout(2500); await settle(pubA);
    await pubB.waitForTimeout(2500); await settle(pubB);
    for (const [page, me, them, label] of [
      [pubA, tenants[0], tenants[1], "A"],
      [pubB, tenants[1], tenants[0], "B"],
    ]) {
      const found = await wordsOn(page, them.words);
      check(`${label}'s booking page shows nothing of ${them.name}`, found.length === 0, found.join(", "));
      // A public page must never carry ANY customer's name, its own included.
      const own = await wordsOn(page, me.people);
      check(`${label}'s booking page shows none of its own customers either`, own.length === 0, own.join(", "));
      check(`${label}'s booking page does show ${me.name}'s own services`,
        (await wordsOn(page, me.words)).length > 0,
        "the page is empty — the two checks above it measured nothing");
    }
  }

  console.log("\n5. B signs out; A is untouched");
  {
    await B.evaluate(() => Object.keys(localStorage).forEach((k) => /sb-|supabase/.test(k) && localStorage.removeItem(k)));
    await B.reload({ waitUntil: "domcontentloaded" });
    await B.waitForTimeout(1500);
    await A.reload({ waitUntil: "domcontentloaded" });
    await A.waitForTimeout(2500);
    await settle(A);
    const brand = await A.locator(".brand").first().textContent().catch(() => "");
    check("A is still signed into their own business", (brand || "").trim() === tenants[0].name, `saw "${brand}"`);
    const bText = await B.evaluate(() => document.body.textContent || "");
    check("and B's signed-out page carries no tenant data at all",
      !tenants[0].words.some((w) => bText.includes(w)) && !tenants[1].words.some((w) => bText.includes(w)));
  }
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
