// THE BOOKING LOOP, END TO END, THROUGH THE REAL UI — roadmap 2.5.
//
//   node scripts/e2e-booking.mjs
//   node scripts/e2e-booking.mjs --slug=demo-detail   # one tenant only
//   node scripts/e2e-booking.mjs --keep               # leave the booking behind
//   node scripts/e2e-booking.mjs --headed             # watch it
//
// Needs the dev server on :5173 and both seeds (`node scripts/seed-demo.mjs`,
// `node scripts/seed-two-tenants.mjs`), like sweep-widths.mjs, plus the root
// `.env` — it reads the database directly to check that what the screen said
// matches what was stored, and it reads the project's edge-function logs to
// see whether the emails were actually sent. It loads `.env` itself, so no
// `set -a` dance.
//
// WHAT IT COVERS, and every leg here was uncovered before it (2026-09-04):
//   book        a customer fills the form in a browser and presses the button.
//               `sweep-booking-steps.mjs` walks the same seven steps but stops
//               ON the review step — nothing in this repo had ever pressed
//               Confirm, so the one action the whole product exists for was
//               exercised by no test at any level.
//   email       the two sends a booking fires. `sendTenantEmail` is
//               best-effort BY DESIGN — "an email failure must never fail a
//               booking" — so a dead relay is a console.error inside an edge
//               function, invisible from every screen and every other test.
//               That is how the 0.2 defect survived: mail was 403ing for every
//               customer and the dashboard looked fine. The only instrument
//               that can see it is the project's own function logs.
//   dashboard   the detailer's side. The request lands on Today, Accept turns
//               it into a job, and the job is findable in the Calendar's
//               history search.
//   the slot    held while the booking stands, free again after a cancel.
//               Asked of `available-slots`, the same function the customer's
//               calendar asks, so this is the answer the NEXT customer gets.
//   reschedule  moved from the receipt page, checked in the database, with
//               both the old slot freed and the new one taken.
//   cancel      cancelled from the receipt page, checked the same way.
//
// TWO TENANTS, BECAUSE THE PRODUCT MAKES TWO PROMISES.
//   demo-detail     REQUEST mode, and the only business anything can sign
//                   into, so it is the one that gets the dashboard leg:
//                   request → Accept → confirmed → reschedule → cancel.
//   demo-riverside  RESERVE mode, which is the schema default and what every
//                   real tenant has. No login exists for it, so this pass is
//                   the customer's half only.
// Running only the demo would leave the mode every real detailer uses walked
// by nothing — this repo's oldest recurring finding, that a script which
// cannot reach a state reports clean on it.
//
// IT MAKES REAL BOOKINGS AND THEN DELETES THEM. The customer address is
// Resend's own `delivered@resend.dev` simulator — the same address roadmap 0.3  // mail-sink: prose about the declared real send below
// used to prove the reminder sweep — so the customer email is genuinely
// accepted by the provider at no cost to the sending reputation the live
// business shares. The owner alert goes to each tenant's contact address,
// which on both seeds is a reserved domain the relay skips before it reaches
// Resend. `--keep` leaves the row for a human to look at.
//
// THE PREDECESSOR: this file used to be a Playwright script pointed at a
// container that no longer exists (a hardcoded `/opt/pw-browsers` path and a
// `/tmp/claude-0/...` scratch dir). It had been dead for weeks and nothing
// noticed, because it was in no list anything runs. Rewritten 2026-09-04.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { reportSourceMoved, watchSource } from "./source-guard.mjs";
import { realMail } from "../tests/_mail.mjs";
// THE PRODUCT'S OWN FORMATTER, IMPORTED RATHER THAN COPIED — 2026-09-13. This
// script printed `$105.00` at a price bar reading `$105` and called two equal
// numbers unequal for a day. `lib/format.js` has said CENTS ONLY WHEN THERE
// ARE CENTS since 2026-09-11 and the page renders `money(quote.total)`, so a
// `toFixed(2)` here was a SECOND copy of a formatting rule, which is the copy
// that goes stale. A read of lane B's file, not a write: if it ever stops
// importing in Node the script dies loudly, which is the correct outcome.
import { money } from "../app/src/lib/format.js";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

if (!process.env.SUPABASE_URL) {
  try { process.loadEnvFile(fileURLToPath(new URL("../.env", import.meta.url))); }
  catch { /* the shell may have exported them already */ }
}
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const REF = process.env.SUPABASE_PROJECT_REF;
const MGMT = process.env.SUPABASE_ACCESS_TOKEN;
if (!URL_ || !SERVICE || !ANON) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY (root .env)");
  process.exit(1);
}

const BASE = process.env.BASE || "http://localhost:5173";
const KEEP = process.argv.includes("--keep");
const HEADED = process.argv.includes("--headed");
const ONLY = process.argv.find((a) => a.startsWith("--slug="))?.slice(7);
// Resend's delivery simulator. Reputation-free and, unlike a reserved domain,
// it goes all the way to the provider — which is the difference between "the
// relay was called" and "the email left the building".
// **THIS IS THE ONE SCRIPT IN THE REPO THAT SPENDS REAL MAIL ON PURPOSE, AND
// IT NOW SAYS SO EVERY RUN.** `realMail` prints the address and the reason;
// `--to=` still overrides it, and `--to=e2e@fixture.test` runs the whole pass
// for free with the provider leg deliberately unproven.
const CUSTOMER_EMAIL = process.argv.find((a) => a.startsWith("--to="))?.slice(5)
  ?? realMail("delivered@resend.dev",
    "the whole point of this pass is that the email leaves the building; --to=e2e@fixture.test runs it free");
// Far enough out to clear both tenants' cancellation windows (24h and 48h)
// with room. A booking inside the window is refused by the server AND the
// receipt page does not draw the buttons, so the last two legs would report a
// missing control rather than a broken one.
const MIN_LEAD_DAYS = 3;

const TENANTS = [
  { slug: "demo-detail", dashboard: { email: "demo@detailplatform.com", password: "demo123" } },  // mail-sink: a dashboard login, never a recipient
  { slug: "demo-riverside", dashboard: null },
].filter((t) => !ONLY || t.slug === ONLY);

let pass = 0, fail = 0, skip = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
// A SKIPPED CHECK READS EXACTLY LIKE A PASSING ONE — this repo's most repeated
// failure, and the reason the count is carried into the summary line rather
// than being a `console.log` somebody scrolls past. `n` is how many checks did
// not get asked, so `passed + failed + skipped` is still the size of the suite.
const skipped = (n, why) => { skip += n; console.log(`  skip  ${n} check(s) — ${why}`); };
const step = (s) => console.log(`\n── ${s} ${"─".repeat(Math.max(0, 58 - s.length))}`);

// --- the database, as the service role -------------------------------------
async function rest(method, path, body) {
  const res = await fetch(URL_ + path, {
    method,
    headers: {
      apikey: SERVICE, Authorization: `Bearer ${SERVICE}`,
      "Content-Type": "application/json", Prefer: "return=representation",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, data: text ? JSON.parse(text) : null }; }
  catch { return { status: res.status, data: text }; }
}
const db = { get: (p) => rest("GET", p), del: (p) => rest("DELETE", p) };

// --- an edge function, as the public site ----------------------------------
async function fn(name, body) {
  const res = await fetch(`${URL_}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: ANON },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { status: res.status, data: text ? JSON.parse(text) : null }; }
  catch { return { status: res.status, data: text }; }
}

// --- the project's own function logs ---------------------------------------
// The ONLY place a failed send is visible. `logs.all` speaks microseconds and
// returns newest first. Returns null when the management credentials are
// absent, so the email leg says "skipped" rather than "passed".
// WHY IT COULD NOT READ THE LOGS, kept beside the null it returns. There are
// TWO ways to get nothing — no credentials, and the Management API refusing —
// and until 2026-09-05 the skip line named only the first. A run right after
// ten deploys and two migrations hit a rate limit, printed *"needs
// SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF"* on the SECOND tenant while
// the first tenant's identical leg had just passed in the same process, and
// sent a session looking at its environment. **A leg that reports the wrong
// half costs more than one that reports nothing** — this file already carries
// that sentence about the reschedule check.
let logsWhy = "";
async function logs(table, sinceMicros) {
  if (!MGMT || !REF) {
    logsWhy = "SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF are not set";
    return null;
  }
  const sql = `select timestamp, event_message from ${table} order by timestamp desc limit 100`;
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/analytics/endpoints/logs.all?sql=${encodeURIComponent(sql)}`,
    { headers: { Authorization: `Bearer ${MGMT}` } },
  );
  if (!res.ok) {
    logsWhy = `the Management API answered ${res.status} — often a rate limit right after a batch of deploys; re-run this leg on its own with --slug=<one>`;
    return null;
  }
  logsWhy = "";
  const body = await res.json().catch(() => null);
  return (body?.result ?? []).filter((r) => Number(r.timestamp) >= sinceMicros);
}

// Poll a condition until it holds. `settle()` is a fine cap on a repaint and
// no wait at all on a network round trip — the lesson sweep-booking-steps.mjs
// already carries — and every button on these two pages is gated on one.
async function until(cond, ms = 12000) {
  const stop = Date.now() + ms;
  for (;;) {
    if (await cond().catch(() => false)) return true;
    if (Date.now() > stop) return false;
    await new Promise((r) => setTimeout(r, 200));
  }
}

// --- SETTLE, NOT SLEEP -----------------------------------------------------
// The same wait sweep-widths.mjs and sweep-booking-steps.mjs use: the number
// is a CAP, and the wait ends when the DOM has been quiet for 130ms with no
// finite animation running and no spinner on the page.
const settle = (page, cap = 1500) => page.evaluate(async (cap) => {
  const t0 = performance.now();
  let last = performance.now();
  const obs = new MutationObserver(() => { last = performance.now(); });
  obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true, characterData: true });
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  try {
    for (;;) {
      await frame();
      const now = performance.now();
      if (now - t0 >= cap) return;
      if (document.querySelector(".spinner, .bk-spinner")) { last = now; continue; }
      const busy = document.getAnimations().some((a) => {
        if (a.playState !== "running") return false;
        const t = a.effect?.getComputedTiming?.();
        return !t || t.iterations !== Infinity;
      });
      if (!busy && now - last >= 130) return;
    }
  } finally { obs.disconnect(); }
}, cap);

// The chips print 12-hour times (`lib/format.js` time12); the engine and the
// row speak 24-hour. Read the screen and convert, rather than deciding a time
// up front and hunting for its label — "1:00 PM" is a substring of "11:00 PM".
// "Sep 8" back into "2026-09-08". The day chips print a short label and carry
// no date attribute, and adding one to a customer's page for a script's benefit
// is the wrong trade — the year comes from the date the run already knows, and
// a December-to-January run would be the only case that needs more than this.
function dateFromChipLabel(label, near) {
  const year = Number(near.slice(0, 4));
  const d = new Date(`${String(label).trim()} ${year} 12:00:00`);
  if (Number.isNaN(d.getTime())) return near;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const time24 = (label) => {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(String(label).trim());
  if (!m) return null;
  const h = (Number(m[1]) % 12) + (/pm/i.test(m[3]) ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2]}`;
};
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const undeliverable = (addr) =>
  /(^|\.)(test|invalid|localhost|example)$|^example\.(com|net|org)$/
    .test(String(addr).split("@").pop()?.toLowerCase() ?? "");

// Started BEFORE the browser opens, so anything saved from here on is a
// mid-run edit. `source-guard.mjs` explains why that matters.
const changedSince = watchSource();
const browser = await chromium.launch({ headless: !HEADED });
// THE CRASH PATH IS THE POINT. On 2026-09-04 this script did not fail, it
// THREW — "Cannot navigate to invalid URL" out of a null receipt link — so a
// diagnosis wired only into the summary below would have printed nothing on
// the one run that needed it.
try {
  for (const tenant of TENANTS) await loop(tenant);
} catch (e) {
  await browser.close();
  console.error(`\n${pass} passed, ${fail} failed${skip ? `, ${skip} skipped` : ""} — then the run threw:\n${e?.message ?? e}`);
  await reportSourceMoved(changedSince, false);
  process.exit(1);
}
await browser.close();

console.log(`\n${pass} passed, ${fail} failed${skip ? `, ${skip} skipped` : ""}`);
// Unconditional: see sweep-widths.mjs and source-guard.mjs's header. A pass
// that reloaded mid-run is the case worth shouting about, not the quiet one.
await reportSourceMoved(changedSince, !fail);
process.exit(fail ? 1 : 0);

// ===========================================================================
async function loop({ slug, dashboard }) {
  const runId = Date.now().toString(36).slice(-5).toUpperCase();
  const NAME = `Smoke ${runId}`;
  // Unique per run, because create-booking upserts the customer BY PHONE
  // within a business — a fixed number would attach every run to one customer
  // row and the cleanup would delete a row the next run is still using.
  const PHONE = `555-01${String(Date.now() % 100).padStart(2, "0")}`;

  // ROADMAP 2.21 — CLEAR THE THROTTLE THIS RUN IS ABOUT TO SPEND.
  //
  // `create-booking` counts bookings per address, and this books more times in
  // two minutes than a real customer does in a year, from one address, all day.
  // **Without it the run starts failing at whichever booking crosses the line
  // and reports it as a broken engine** — which is exactly what happened to
  // `booking-engine` the first time it ran after the filter shipped: a 429 in
  // the middle of test 2 and thirty-two cascading failures behind it.
  //
  // It clears rather than exempting: the limits stay set by what a real
  // customer does, and the harness pays for its own noise.
  await db.del("/rest/v1/rate_hits?bucket=like.booking%25");
  const biz = (await db.get(`/rest/v1/businesses?slug=eq.${slug}&select=id,name,contact_email,timezone`)).data?.[0];
  if (!biz) {
    fail++;
    console.error(`\nFAIL  no business with slug ${slug} — run the seed scripts`);
    return;
  }
  // AND SWEEP THE BOOKINGS EARLIER RUNS LEFT BEHIND — 2026-09-17.
  //
  // The cleanup at the bottom of this file runs in a `finally`, so an ordinary
  // failure tidies up after itself. **A killed process does not**, and two
  // `Smoke` bookings from 2026-09-11 were still sitting live on
  // demo-riverside six days later, holding 09:00 and 13:00 on 14 September.
  //
  // THAT IS NOT COSMETIC, because one booking costs FAR more than one slot:
  // measured on demo-riverside, a single 75-minute job with the tenant's
  // 45-minute buffer took the day's offered times from EIGHT to FOUR. So the
  // residue makes every later run's chosen day denser, and a denser day is
  // what produced the intermittent refusal `FOUND.md` § THE SECOND RUN chased
  // — a run whose calendar is quietly different from the last run's is a
  // measurement nobody can reproduce.
  //
  // `Smoke ` is this script's own prefix and nothing else in the product
  // writes it; the six-hour floor is so a `--keep` row survives long enough
  // for the human it was kept for.
  {
    const stale = new Date(Date.now() - 6 * 3600_000).toISOString();
    const left = (await db.get(
      `/rest/v1/bookings?business_id=eq.${biz.id}&customer_name=like.Smoke%20*`
      + `&created_at=lt.${stale}&select=id,start_at,customer_name`,
    )).data ?? [];
    if (left.length) {
      for (const r of left) await db.del(`/rest/v1/bookings?id=eq.${r.id}`);
      console.log(`  swept ${left.length} booking(s) a killed run left behind: `
        + left.map((r) => `${r.customer_name} ${String(r.start_at).slice(0, 16)}`).join(", "));
    }
  }

  const settings = (await db.get(
    `/rest/v1/business_settings?business_id=eq.${biz.id}`
    + "&select=booking_mode,cancellation_window_hours,notification_emails",
  )).data?.[0] ?? {};
  const isRequest = settings.booking_mode === "request";
  const ownerTo = (settings.notification_emails ?? []).filter(Boolean)[0] || biz.contact_email;

  // The shortest service, so the widest choice of open slots. Chosen from the
  // database rather than by clicking the first card, so the availability
  // question below can be asked about the SAME service the browser picks.
  const service = (await db.get(
    `/rest/v1/services?business_id=eq.${biz.id}&select=id,name,duration_minutes`
    + "&order=duration_minutes.asc&limit=1",
  )).data?.[0];

  // ASK THE ENGINE WHICH DAY, THEN DRIVE THE BROWSER TO IT. Walking the
  // calendar hunting for an open cell is how sweep-booking-steps.mjs lost most
  // of a session to a race: picking a day re-renders the grid. The engine can
  // answer the question directly.
  const range = await fn("available-slots", {
    business_slug: slug,
    duration_minutes: service?.duration_minutes ?? 60,
    service_ids: [service.id],
    start_date: iso(new Date(Date.now() + MIN_LEAD_DAYS * 86400_000)),
    end_date: iso(new Date(Date.now() + 45 * 86400_000)),
  });
  const openDay = Object.entries(range.data?.days ?? {})
    .find(([, v]) => v.open && (v.slots ?? []).length > 1);
  if (!openDay) {
    fail++;
    console.error(
      `\nFAIL  no day with an open slot in the next 45 days for "${service?.name}" at ${slug}. `
      + "Re-seed and check available-slots by hand.",
    );
    return;
  }
  // `let`, not `const`: the reschedule leg can legitimately move the booking to
  // ANOTHER day (see its own comment), and every check after it — the cancel,
  // and the slot coming back — is about wherever the booking actually is.
  let [DATE] = openDay;
  // The TIME is not decided here. `available-slots` answers with three lists —
  // all slots, drop-off slots and mobile slots — and the step shows whichever
  // matches the service type the customer ended up with, so a time chosen from
  // the wrong list is a chip that is not on the screen. Click what is offered
  // and read it back; every later assertion uses that.
  let TIME = null;
  // The duration the CALENDAR was asked about, read off the page's own request
  // rather than assumed. A vehicle size or an add-on makes the booked job
  // longer than the service's base minutes, and a calendar asked about the
  // short number offers slots the submit gate then refuses.
  let CHOSE_DURATION = null;

  console.log(`\n${"═".repeat(64)}\n${biz.name} (${slug}) · ${settings.booking_mode} mode`
    + ` · cancel window ${settings.cancellation_window_hours}h`);
  console.log(`${NAME} · ${service.name} · ${DATE}`);

  const t0 = Date.now() * 1000;
  const ctx = await browser.newContext({ viewport: { width: 392, height: 844 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => {
    Object.defineProperty(navigator, "share", { value: () => Promise.resolve(), configurable: true });
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const consoleErrors = [];
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${e}`));

  // WHAT THE PAGE WAS ACTUALLY TOLD — 2026-09-17, FOUND.md § THE SECOND RUN.
  // The refusal this chases ("that time is too close to another booking") and
  // its mirror ("the cancelled time is not offered again") are the SAME
  // disagreement seen from two sides: what `available-slots` listed against
  // what `validateSlot` allowed. **Re-asking the endpoint afterwards answers a
  // different question** — a different duration, a different moment, a
  // different set of bookings — so the only honest record is the answer the
  // BROWSER got, captured as it lands.
  const slotCalls = [];
  page.on("response", async (res) => {
    if (!/\/functions\/v1\/available-slots(\?|$)/.test(res.url())) return;
    let req = null, body = null;
    try { req = JSON.parse(res.request().postData() ?? "null"); } catch { /* not JSON */ }
    try { body = await res.json(); } catch { /* not JSON */ }
    slotCalls.push({ req, body });
  });
  // The LAST answer the page got that covers this day, and the duration it was
  // asked about. `null` means the page never asked — which is itself the
  // finding, and NOT a reason to fall back to a fresh call of our own.
  const pageOffered = (date) => {
    for (let i = slotCalls.length - 1; i >= 0; i--) {
      const { req, body } = slotCalls[i];
      if (!body?.success) continue;
      const list = body.days?.[date]?.slots ?? (req?.booking_date === date ? body.slots : null);
      if (Array.isArray(list)) return { duration: Number(req?.duration_minutes), slots: list };
    }
    return null;
  };

  let bookingId = null;
  try {
    // -----------------------------------------------------------------------
    step("1. the customer books, in a browser");
    // -----------------------------------------------------------------------
    await page.goto(`${BASE}/book/${slug}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card, .bk-note", { timeout: 30000 });
    await settle(page, 2400);
    ok("the booking page names the business", (await page.textContent(".bk-header h1"))?.includes(biz.name));

    // Advance by the step's own HEADING, never by counting: roadmap 2.7 made
    // the flow BUILT rather than fixed (add-ons get their own step, and only
    // where a business has any), so a script that assumes seven steps fills
    // the wrong field the day a tenant has none.
    const total = Number((await page.locator(".bk-step-head .bk-step-label").innerText()).match(/of (\d+)/i)[1]);
    for (let n = 1; n <= total; n++) {
      const head = await page.locator(".bk-step-head h2").innerText();

      if (n === 1) {
        await page.locator(".bk-card", { hasText: service.name }).first().click();
        await settle(page, 1800);
      } else if (/pick a time/i.test(head)) {
        const want = new Date(`${DATE}T12:00:00`);
        const wantMonth = want.toLocaleDateString("en-US", { month: "long", year: "numeric" });
        for (let hop = 0; hop < 4; hop++) {
          if ((await page.locator(".bk-cal-block h2").first().innerText()).trim() === wantMonth) break;
          await page.getByRole("button", { name: "Next month" }).first().click();
          await settle(page, 1600);
        }
        const cell = page.locator(".bk-cal .cell", { hasText: new RegExp(`^${want.getDate()}$`) }).first();
        // WAIT FOR THE GRID: `count()` DOES NOT AUTO-WAIT AND `getAttribute()`
        // DOES. That mismatch is the whole of the "tenth failure" FOUND.md
        // recorded twice at `1cf5f98`, and it is the check rather than the
        // calendar — the failure detail printed `cell   `, an OPEN cell with
        // no `closed` in its class, because `getAttribute()` waited and found
        // the very cell `count()` had just missed a moment earlier.
        // `StepWhen.jsx` paints no grid at all until `available-slots` answers
        // (`!loading && days !== null`, and gating on the ANSWER is correct),
        // so a slow answer means zero cells at the instant `count()` is asked.
        // A `settle()` long enough this morning is too short on a slower one:
        // it passed on both tenants at 13:44 and failed on the second at
        // 13:57, same commit, same date, same tree.
        const appeared = await until(async () => await cell.count() > 0, 20000);
        ok(`${DATE} is open on the customer's calendar`,
          appeared && !/closed/.test((await cell.getAttribute("class")) ?? ""),
          appeared ? await cell.getAttribute("class")
            : "no cell after 20s — available-slots never painted a grid");
        await cell.click();
        await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
        await settle(page, 900);
        const chip = page.locator(".bk-slots .bk-chip").first();
        TIME = time24(await chip.innerText());
        ok(`a time is offered on that day (${TIME})`, !!TIME);
        {
          const chips = (await page.locator(".bk-slots .bk-chip").allInnerTexts())
            .map(time24).filter(Boolean);
          const told = pageOffered(DATE);
          CHOSE_DURATION = told?.duration ?? null;
          console.log(`  chose  ${DATE} ${TIME}`);
          console.log(`  chips  ${chips.join(" ") || "(none)"}`);
          console.log(`  told   ${told
            ? `available-slots @${told.duration}min listed ${told.slots.join(" ") || "(nothing)"}`
            : "THE PAGE NEVER ASKED available-slots ABOUT THIS DAY"}`);
          // The one that separates the two candidate causes in a single run.
          ok(`the chosen time ${TIME} was on available-slots' own list`,
            !!told && told.slots.includes(TIME),
            told ? `@${told.duration}min it listed: ${told.slots.join(" ")}`
              : `no available-slots answer covering ${DATE}`);
        }
        await chip.click();
        await settle(page, 500);
      } else {
        // Everything else takes whatever it asks for: a card per unanswered
        // group, then the fields.
        for (let guard = 0; guard < 3; guard++) {
          const groups = await page.locator(".bk-choices").count();
          const answered = await page.locator(".bk-card.selected").count();
          if (!(await page.locator(".bk-card.selectable").count()) || answered >= Math.max(1, groups)) break;
          await page.locator(".bk-card.selectable:not(.selected)").first().click();
          await settle(page, 900);
        }
        // FILL BY THE BROWSER'S OWN AUTOFILL TOKEN, NEVER BY THE HEADING —
        // 2026-09-13, and this one line was FIVE of the nine failures.
        // The details step asked "How can we reach you?" until 2026-09-12,
        // when it deliberately became "Your details"; the `/reach you/` test
        // that used to live here then typed the ADDRESS into the name box.
        // The customer was therefore called "140 Market Street, Long Beach,
        // CA", so `with the name the customer typed` went red on both
        // tenants AND the dashboard leg, which searches for NAME, could not
        // find the request card, never pressed Accept, and reported the
        // booking as still pending and missing from the calendar's history.
        // Four checks failing about the dashboard, and the dashboard was fine.
        // `autocomplete` is what a field DOES; a heading is how it is
        // written (CLAUDE.md trap (h)).
        let sawNameBox = false;
        for (const [sel, value] of [
          [".bk-field input[type=tel]", PHONE],
          [".bk-field input[type=email]", CUSTOMER_EMAIL],
          [".bk-field input[autocomplete=name]", NAME],
          [".bk-field input[autocomplete=street-address]", "140 Market Street, Long Beach, CA"],
        ]) {
          if (!(await page.locator(sel).count())) continue;
          if (sel.includes("autocomplete=name")) sawNameBox = true;
          await page.locator(sel).first().fill(value);
        }
        // The step that asks for a name is the only one that can be told
        // apart by a token, so it is the only one that gets an assertion. It
        // is here rather than at the end because a name box that has moved or
        // lost its token has to be LOUD: the four downstream failures above
        // all named the dashboard and none of them named this.
        if (/details/i.test(head) || sawNameBox) {
          ok("the form has a name box the browser can autofill", sawNameBox,
            "no .bk-field input[autocomplete=name] on the step headed " + head);
        }
        // Anything left that is free text and still empty — the vehicle box,
        // a drop-off note — takes the address, so a step this script has never
        // met still clears its blockers. It is no longer how the NAME is set.
        const text = page.locator(
          ".bk-field input:not([type=tel]):not([type=email])"
          + ":not([autocomplete=name]):not([autocomplete=street-address])",
        ).first();
        if (await text.count() && !(await text.inputValue())) {
          await text.fill("140 Market Street, Long Beach, CA");
        }
        await settle(page, 500);
      }

      if (n === total) break;
      // Continue is disabled while the server quote is in flight — the price
      // bar gates every step, not just the first — so wait for it rather than
      // reading it the instant the card is clicked.
      const next = page.locator(".bk-bar button.bk-btn.primary");
      ok(`step ${n} (${head.slice(0, 24)}) can be advanced`, await until(() => next.isEnabled()));
      await next.click();
      await settle(page, 1600);
    }

    const bar = (await page.locator(".bk-bar .total strong").innerText()).trim();
    // Cents are OPTIONAL, and deliberately so — `lib/format.js`, 2026-09-11.
    // This demanded `.\d\d` until 2026-09-13 and went red on `$105`, which is
    // trap (h): a check coupled to a SPELLING breaks the day the product
    // changes that spelling on purpose. The comma group is still required
    // above 999, because that half of the same decision is still a rule.
    ok("the review step prints a total", /^\$\d{1,3}(,\d{3})*(\.\d\d)?$/.test(bar), bar);

    // THE PRESS NOTHING IN THIS REPO HAD EVER DONE.
    const label = await page.locator(".bk-bar button.bk-btn.primary").innerText();
    ok(`the button says what pressing it does (${label.trim()})`,
      isRequest ? /request/i.test(label) : /confirm/i.test(label), label);
    await page.locator(".bk-bar button.bk-btn.primary").click();
    // A 409 here — the slot went while the form was being filled, or a rule
    // refused it — draws .bk-error and never leaves the step, so waiting only
    // for the heading turns a refusal into a locator timeout with no message.
    await until(async () =>
      await page.locator(".bk-wrap h1").count() > 0 || await page.locator(".bk-error").count() > 0, 30000);
    await settle(page, 1800);
    const submitErr = await page.locator(".bk-error").first().innerText().catch(() => "");
    ok("the booking was not refused", !submitErr, submitErr);
    if (submitErr) {
      // A refusal is only a PRODUCT fault if the slot was offered. Printing
      // both sides here is the difference between "available-slots and
      // validateSlot disagree" and "the script clicked something nothing
      // offered", which is the whole question FOUND.md left open.
      const told = pageOffered(DATE);
      const now = await fn("available-slots", {
        business_slug: slug, booking_date: DATE,
        duration_minutes: CHOSE_DURATION || service.duration_minutes, service_ids: [service.id],
      });
      console.log(`  REFUSED ${DATE} ${TIME} — "${submitErr}"`);
      console.log(`  offered ${told ? `@${told.duration}min ${told.slots.join(" ")}` : "(the page never asked)"}`);
      console.log(`  now     @${CHOSE_DURATION || service.duration_minutes}min `
        + JSON.stringify(now.data?.slots ?? now.data ?? null).slice(0, 200));
    }

    const done = await page.locator(".bk-wrap h1").innerText().catch(() => "");
    ok("the confirmation screen says what happened",
      isRequest ? /holding your time/i.test(done) : /booked/i.test(done), done);
    const receiptPath = await page.evaluate(() => {
      const a = [...document.querySelectorAll("a")].map((x) => x.href).find((h) => h && h.includes("/booking/"));
      return a ? new URL(a).pathname : null;
    });
    ok("it links to the receipt", !!receiptPath?.startsWith("/booking/"), String(receiptPath));
    bookingId = receiptPath?.split("/").pop() ?? null;
    // Where the booking STARTED, so the cancel check can say whether it is
    // asking about the time that was booked or a time the reschedule moved it
    // to. FOUND.md's step 2: a stale expectation and a product fault look the
    // same from the failure line alone.
    const ORIG_DATE = DATE, ORIG_TIME = TIME;

    // -----------------------------------------------------------------------
    step("2. and the row says the same thing the screen did");
    // -----------------------------------------------------------------------
    // THE ROW STORES AN INSTANT, NOT A DATE AND A TIME. `bookings` has
    // `start_at timestamptz` and nothing else; every local date and time in
    // this product is derived from it in the business's own zone
    // (hooks/useBookings.js for the dashboard, _shared/tz.ts for the emails).
    // A script that asks PostgREST for `booking_date` gets a 42703 and an
    // empty row, which reads exactly like "the booking was never made".
    const localOf = (row) => {
      if (!row?.start_at) return {};
      const p = new Intl.DateTimeFormat("en-CA", {
        timeZone: biz.timezone, year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", hour12: false,
      }).formatToParts(new Date(row.start_at)).reduce((a, x) => (a[x.type] = x.value, a), {});
      return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour === "24" ? "00" : p.hour}:${p.minute}` };
    };
    const rowOf = async () => (await db.get(
      `/rest/v1/bookings?id=eq.${bookingId}`
      + "&select=id,status,start_at,end_at,total_price,customer_name,customer_email",
    )).data?.[0];
    let row = await rowOf();
    ok("the booking is in the database", !!row, bookingId ?? "no id");
    ok("with the name the customer typed", row?.customer_name === NAME, row?.customer_name);
    ok(`stored as ${isRequest ? "pending" : "confirmed"}`,
      row?.status === (isRequest ? "pending" : "confirmed"), row?.status);
    ok("on the day and at the time that were picked",
      localOf(row).date === DATE && localOf(row).time === TIME,
      `${localOf(row).date} ${localOf(row).time}`);
    // The one that has already been wrong once in this product's life: a
    // number PRINTED is not a number CHARGED.
    ok("charged what the price bar printed",
      money(row?.total_price) === bar, `bar ${bar}, row ${row?.total_price}`);
    // THE LENGTH THE JOB ACTUALLY TAKES, which is not the service's own
    // duration once a vehicle size or an add-on is in play. Every availability
    // question after this is only meaningful asked at THIS number, and a
    // calendar asked about a shorter one offers slots the gate then refuses —
    // the exact failure `docs/tenant-site-contract.md` names.
    const bookedMinutes = row?.end_at && row?.start_at
      ? Math.round((new Date(row.end_at) - new Date(row.start_at)) / 60000)
      : null;
    console.log(`  length ${bookedMinutes}min booked · ${service.duration_minutes}min base service`
      + ` · ${CHOSE_DURATION ?? "?"}min the calendar was asked about`);
    ok("the calendar was asked about the length actually booked",
      CHOSE_DURATION !== null && CHOSE_DURATION === bookedMinutes,
      `calendar ${CHOSE_DURATION}, booked ${bookedMinutes}`);

    // -----------------------------------------------------------------------
    step("3. both emails leave the building");
    // -----------------------------------------------------------------------
    {
      // Best-effort sending means nothing on any screen can answer this. The
      // relay calls are awaited inside create-booking, but the log pipeline is
      // a few seconds behind, so give it a moment.
      let edge = null;
      for (let i = 0; i < 12; i++) {
        edge = await logs("function_edge_logs", t0);
        if (edge === null) break;
        if (edge.filter((r) => /\/send-email/.test(r.event_message)).length >= 2) break;
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (edge === null) {
        console.log(`  skip  could not read the edge-function logs — ${logsWhy}`);
      } else {
        const said = ((await logs("function_logs", t0)) ?? []).map((r) => r.event_message).join("\n");
        const sends = edge.filter((r) => /\/send-email/.test(r.event_message));
        ok("the relay was called twice — one customer, one owner", sends.length >= 2, `${sends.length} call(s)`);
        // THE DAY'S TENANT ALLOWANCE CAN BE SPENT BEFORE THIS RUNS, AND THAT
        // IS THE BUDGET WORKING — `docs/email-budget.md`. Tenant mail stops at
        // `email_daily_cap - email_platform_reserve`, `send-email` answers 429
        // with `"reason":"daily_cap"`, and every question below then has no
        // answer the day can give: the provider was never called, so "did it
        // take it" is unanswerable rather than answered no.
        //
        // **AND TWO OF THE THREE RED LINES IT PRODUCED WERE WRONG ABOUT WHY.**
        // "the relay skipped it instead — see send-email's
        // undeliverable-domain guard" named the wrong guard entirely:
        // `delivered@resend.dev` is not a reserved domain, it was refused a  // mail-sink: prose about the address declared at the top of this file
        // budget. A failure with a false diagnosis attached is how a suite
        // teaches people to scroll past it, which is the disease this whole
        // file is being repaired for.
        //
        // The gate is OUR OWN function log carrying the literal reason, so a
        // provider failure of any other kind still goes red.
        const capped = /"reason"\s*:\s*"daily_cap"/.test(said);
        if (capped) {
          skipped(2, "the provider leg — today's TENANT email allowance is spent "
            + "(send-email answered 429 daily_cap). docs/email-budget.md's reserve, working as "
            + "designed; the platform's own alerts are still reserved. The day rolls at 00:00 UTC.");
        } else {
          // A non-2xx from Resend makes send-email answer non-200 and log
          // "Resend API error", so these two together are the whole of the
          // question "did it leave the building".
          ok("and answered 200 every time", sends.every((r) => / 200 /.test(r.event_message)),
            sends.map((r) => r.event_message).join(" | "));
          ok("the provider took it", !/Resend API error|relay failed|relay error/i.test(said),
            (said.match(/(?:Resend API error|relay (?:failed|error)).*/i) ?? [""])[0]);
        }
        for (const [who, to] of [["customer", CUSTOMER_EMAIL], ["owner", ownerTo]]) {
          if (capped && !undeliverable(to)) {
            skipped(1, `whether the ${who}'s email (${to}) reached the provider — same spent allowance`);
          } else if (undeliverable(to)) {
            // A reserved domain is skipped before the provider, and the relay
            // says so with the recipient and the subject — which is how this
            // can name WHO each email was for without a mailbox to look in.
            ok(`the ${who}'s email was addressed to ${to}, and skipped as undeliverable`,
              said.includes(`to: "${to}"`), "no send-email log line names it");
          } else {
            ok(`the ${who}'s email reached the provider (${to})`,
              !said.includes(`to: "${to}"`),
              "the relay skipped it instead — see send-email's undeliverable-domain guard");
          }
        }
        const subjects = [...said.matchAll(/subject: "([^"]+)"/g)].map((m) => m[1]);
        if (subjects.length) console.log(`  note  skipped subjects: ${subjects.join(" | ")}`);
      }
    }

    // -----------------------------------------------------------------------
    step("4. the slot is held against the next customer");
    // -----------------------------------------------------------------------
    // AN EMPTY ANSWER IS NOT A NEGATIVE ANSWER — the hollow pass in this file,
    // found 2026-09-13 while auditing the greens rather than the reds.
    //
    // `?? []` turned every failure of `available-slots` into an empty list,
    // and TWO of this script's most important checks read a MISSING time as
    // proof of something: *"08:00 is no longer offered"* and *"09:00 is
    // taken"* are the double-booking guard, and both went GREEN on a list
    // that came back empty because the call died. The one check that reads a
    // PRESENT time — *"the cancelled time is offered again"* — was safe all
    // along, which is why this survived: half the leg really was testing.
    //
    // AND IT IS NOT THEORETICAL. Lane C queue item 2 is Andrew hitting this
    // exact endpoint answering 200 with no days at all, three months running,
    // on a live tenant. Roughly 1.1% of this project's REST calls come back
    // 504 (`FOUND.md` § THE "GATEWAY TIMEOUT" IS OUR OWN CATCH BLOCK), so an
    // empty list here is a thing that happens rather than a thing to imagine.
    //
    // So the read is asserted where it is made, once, instead of being read
    // as three green ticks downstream.
    const slotsOn = async (date) => {
      const r = await fn("available-slots", {
        business_slug: slug, booking_date: date,
        // THE BOOKED LENGTH, not the service's base minutes — 2026-09-17.
        // Asking about a shorter job asks a different and easier question, and
        // "is this slot free again" is only an answer about the booking that
        // was actually made.
        duration_minutes: bookedMinutes || service.duration_minutes,
        service_ids: [service.id],
      });
      const list = Array.isArray(r.data?.slots) ? r.data.slots : null;
      ok(`available-slots answered for ${date}`, list !== null,
        `HTTP ${r.status} — ${JSON.stringify(r.data ?? "").slice(0, 160)}`);
      return list ?? [];
    };
    let free = await slotsOn(DATE);
    // ROADMAP 2.12's load-bearing fact, established by NOT writing something:
    // `pending` is absent from the exclusion constraint's WHERE clause, so a
    // request holds its time exactly like a confirmed booking does.
    ok(`${TIME} is no longer offered${isRequest ? " (a request holds its slot)" : ""}`,
      !free.includes(TIME), free.join(" "));

    // -----------------------------------------------------------------------
    if (dashboard) {
      step("5. it shows up on the detailer's dashboard");
      // ---------------------------------------------------------------------
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
      if (await page.locator("input[type=email]").count()) {
        await page.fill("input[type=email]", dashboard.email);
        await page.fill("input[type=password]", dashboard.password);   // scripts/seed-demo.mjs
        await page.click("form button.btn.primary");
      }
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await settle(page, 2400);

      if (isRequest) {
        const card = page.locator(".reqcard", { hasText: NAME });
        ok("the request is waiting on Today", await card.count() > 0);
        if (await card.count()) {
          await card.locator("button", { hasText: "Accept" }).first().click();
          const gone = await until(async () => await page.locator(".reqcard", { hasText: NAME }).count() === 0);
          await settle(page, 1200);
          row = await rowOf();
          ok("Accept turns it into a job", row?.status === "confirmed", row?.status);
          ok("and it leaves the queue", gone);
        }
      }

      // The Calendar's history search is the one place on the dashboard that
      // can be asked about a job on ANY date, which is what a booking three
      // days out needs — Today carries today and tomorrow.
      await page.getByRole("button", { name: "Calendar", exact: true }).first().click();
      await settle(page, 2000);
      await page.getByRole("button", { name: "History", exact: true }).first().click();
      await settle(page, 2000);
      const search = page.locator('input[aria-label="Search bookings"]');
      if (await search.count()) {
        await search.first().fill(runId);
        await settle(page, 1400);
        ok("the job is findable in the calendar's history",
          await page.locator(".rows.cols.history .row-item", { hasText: NAME }).count() > 0);
      } else {
        ok("the calendar's history has a search box", false, "no input labelled 'Search bookings'");
      }
    }

    // -----------------------------------------------------------------------
    step(`${dashboard ? 6 : 5}. the customer moves it from the receipt page`);
    // -----------------------------------------------------------------------
    // **A NULL PATH IS A SKIP, NOT A NAVIGATION — 2026-09-14.** When the booking
    // is refused, `receiptPath` is null and this did
    // `page.goto("http://127.0.0.1:4175" + null)`, which Playwright rejects as an
    // invalid URL and THROWS. On the 00:00 run that ended the whole pass at
    // 19 passed / 10 failed with the SECOND TENANT never attempted — one refused
    // booking cost every subject below it, and the summary said nothing about
    // which ones were never reached. Trap (c)’s family: a check that dies partway
    // prints an exit code and no account of what it skipped.
    //
    // It costs one leg now instead of a tenant, and it SAYS so.
    if (!receiptPath) {
      skipped(13, "the receipt page and the cancel — no receipt path, because the booking "
        + "above was refused or never created, so both sections had nothing to act on");
    } else {
    await page.goto(`${BASE}${receiptPath}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bk-card, .bk-center h2", { timeout: 30000 });
    await settle(page, 1800);
    ok("the receipt page shows the booking", (await page.textContent("body"))?.includes(biz.name));

    const changeBtn = page.locator("button", { hasText: /change the time/i }).first();
    ok("the receipt offers a reschedule", await changeBtn.count() > 0,
      "outside the cancellation window it should be drawn");
    if (await changeBtn.count()) {
      await changeBtn.click();
      await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 15000 });
      await settle(page, 1200);
      // The day chips are the first .bk-slots group; the times appear in a
      // second group once a day is chosen.
      const wantDay = new Date(`${DATE}T12:00:00`)
        .toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const dayChip = page.locator(".bk-slots").first().locator(".bk-chip", { hasText: wantDay }).first();
      // WHY THIS ONE CAN LEGITIMATELY BE ABSENT, and it cost a diagnosis on
      // 2026-09-05 before it was written down. `available-slots` has NO
      // exclusion parameter, so it cannot know about the booking being MOVED —
      // it counts that booking as occupied like any other. If the day's only
      // remaining room is the slot this booking is already in, the day has
      // zero free slots FOR ITS OWN OCCUPANT and drops out of its own
      // reschedule picker. That is real (a customer cannot move within their
      // own day when they are what fills it) and it is not this leg's subject;
      // it depends on the date the run happens to pick and on how full the
      // seed left that day, so it passes most days and fails on the ones where
      // the booked service is long enough to swallow the rest of the afternoon.
      // Recorded in docs/roadmap.md under "Not on the roadmap yet".
      const dayOffered = await dayChip.count() > 0;
      ok(`the booked day (${wantDay}) is offered to move within`, dayOffered,
        "available-slots counts this booking as occupied, so a day whose only "
        + "free room IS this booking's slot drops out of its own picker");
      await (dayOffered ? dayChip : page.locator(".bk-slots").first().locator(".bk-chip").first()).click();
      await settle(page, 1800);
      // AND THE ASSERTIONS BELOW FOLLOW THE DAY THAT WAS ACTUALLY CLICKED.
      // They used to ask about `DATE` whatever happened, so a missing day chip
      // produced a SECOND failure — "16:30 is taken" against a date the
      // booking had just left — which points at the slot engine instead of at
      // the one thing that went wrong. One root cause must print as one
      // failure, or the next session debugs the wrong half.
      const movedDate = dayOffered ? DATE : dateFromChipLabel(
        await page.locator(".bk-slots").first().locator(".bk-chip").first().innerText(), DATE);
      // Whatever it offers, minus the time it is already on — the buffer takes
      // the slots either side of a live booking, so the free time on this day
      // is not the one next to it and picking a number in advance is guesswork.
      const times = page.locator(".bk-slots").nth(1).locator(".bk-chip");
      let timeChip = null;
      for (const c of await times.all()) {
        if (time24(await c.innerText()) !== TIME) { timeChip = c; break; }
      }
      // **A DAY WHOSE ONLY FREE SLOT IS THIS BOOKING'S OWN IS A FULL DAY, AND
      // A FULL DAY CANNOT EXERCISE A MOVE.** Since item F the picker excludes
      // the booking from its own availability, so a nearly-full day offers
      // exactly one chip — the time it is already on — and this check reported
      // that as a defect. Reproduced on `demo-detail` while `demo-riverside`
      // passed the identical leg on the same code, which is what a
      // date-and-occupancy failure looks like from the outside.
      //
      // **SO IT PRINTS RATHER THAN FAILS, and it prints rather than skipping.**
      // A check that cannot reach its case must say so — this repo's own rule,
      // learned from the Clients block whose six vanishing measurements read
      // exactly like six passing ones. The next four checks are the move, and
      // they are skipped with it.
      const chipTexts = (await times.allInnerTexts()).join(" ");
      if (!timeChip && chipTexts.trim()) {
        console.log("  NOT MEASURED  the move — "
          + `${DATE} has no room but this booking's own time (${chipTexts})`);
        // **AND LEAVE THE PICKER, or the section after this measures a page
        // still in reschedule mode.** Skipping a step is not the same as
        // undoing it: the first version printed NOT MEASURED and then reported
        // "the receipt offers a cancel" as a failure, which is one skipped
        // check producing a second, wrong one — the shape this file already
        // records under "a leg that reports the wrong half costs more than one
        // that reports nothing".
        await page.locator("button", { hasText: /keep (it|this)|never mind|cancel/i })
          .first().click().catch(() => {});
        await settle(page, 800);
        if (await page.locator("button", { hasText: /move my booking/i }).count()) {
          await page.reload({ waitUntil: "domcontentloaded" });
          await settle(page, 1500);
        }
      } else {
        ok("a different time is offered on that day", !!timeChip,
          chipTexts || "no time chips");
      }
      if (timeChip) {
        const MOVED = time24(await timeChip.innerText());
        await timeChip.click();
        await settle(page, 400);
        await page.locator("button", { hasText: /move my booking/i }).first().click();
        // A move is a network round trip with no spinner on the page, so
        // waiting for the DOM to go quiet reads the OLD row and reports a
        // working reschedule as broken. Wait for the page to leave reschedule
        // mode — or for the error it drew instead.
        await until(async () =>
          await page.locator("button", { hasText: /move my booking/i }).count() === 0
          || await page.locator(".bk-error").count() > 0);
        await settle(page, 1200);
        const moveErr = await page.locator(".bk-error").first().innerText().catch(() => "");
        ok("the move was not refused", !moveErr, moveErr);

        row = await rowOf();
        ok(`the row moved to ${MOVED}`, localOf(row).time === MOVED, localOf(row).time);
        ok("it is still a live booking", row?.status === (isRequest && !dashboard ? "pending" : "confirmed"), row?.status);
        free = await slotsOn(DATE);
        // THE OLD TIME IS ONLY FREE IF THE NEW ONE DOES NOT COVER IT, and
        // that stopped being automatic on 2026-09-06. Until item F was fixed,
        // a booking counted itself as occupied, so the only times ever
        // OFFERED for a move were far from where it already was; now its own
        // day is open to it and the picker's first different chip is usually
        // the ADJACENT half hour. A booking that moved 08:00 → 08:30 makes
        // 08:00 genuinely unbookable — a new job starting there would run
        // into it — so asserting the old slot is free again would be
        // asserting the engine is wrong.
        //
        // **The assumption broke, not the product**, and this is the second
        // time this file has reported a working booking engine as broken. So
        // the check now asks the question it always meant: is the time free,
        // OR is it covered by where the booking went?
        const covered = (a, b) => {
          const mins = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
          return Math.abs(mins(a) - mins(b)) < (service?.duration_minutes ?? 60);
        };
        ok(`the old time ${TIME} is free again, or the move covers it`,
          free.includes(TIME) || covered(TIME, MOVED),
          `moved to ${MOVED}, ${service?.duration_minutes ?? 60} min; free: ${free.join(" ")}`);
        const after = movedDate === DATE ? free : await slotsOn(movedDate);
        ok(`and ${MOVED} is taken${movedDate === DATE ? "" : ` on ${movedDate}`}`,
          !after.includes(MOVED), after.join(" "));
        TIME = MOVED;
        DATE = movedDate;
      }
    }

    // -----------------------------------------------------------------------
    step(`${dashboard ? 7 : 6}. and cancels it, which gives the slot back`);
    // -----------------------------------------------------------------------
    const cancelBtn = page.locator("button", { hasText: /cancel this (booking|request)/i }).first();
    ok("the receipt offers a cancel", await cancelBtn.count() > 0);
    if (await cancelBtn.count()) {
      await cancelBtn.click();
      await settle(page, 900);
      await page.locator("button", { hasText: /yes, cancel it/i }).first().click();
      await until(async () => /cancelled/i.test(await page.textContent(".bk-wrap")));
      await settle(page, 1200);
      ok("the page says it is cancelled", /cancelled/i.test(await page.textContent("body")));
      row = await rowOf();
      ok("and so does the row", row?.status === "cancelled", row?.status);
      free = await slotsOn(DATE);
      const movedHere = DATE !== ORIG_DATE || TIME !== ORIG_TIME;
      console.log(`  asking ${DATE} ${TIME} @${bookedMinutes || service.duration_minutes}min`
        + (movedHere ? ` — MOVED here from ${ORIG_DATE} ${ORIG_TIME}` : " — never moved"));
      ok(`the cancelled time ${TIME} is offered again`, free.includes(TIME),
        `@${bookedMinutes || service.duration_minutes}min: ${free.join(" ") || "(nothing)"}`);
    }

    }  // end: there was a receipt path

    // **OUTSIDE THE GUARD ON PURPOSE.** A refused booking is exactly when a
    // console error is most worth knowing about, so this one still runs.
    ok("no console errors anywhere in the loop", consoleErrors.length === 0,
      consoleErrors.slice(0, 3).join(" | "));
  } finally {
    await ctx.close();
    if (bookingId && !KEEP) {
      await db.del(`/rest/v1/bookings?id=eq.${bookingId}`);
      await db.del(`/rest/v1/customers?business_id=eq.${biz.id}&phone=eq.${encodeURIComponent(PHONE)}`);
    } else if (bookingId) {
      console.log(`\nkept: booking ${bookingId} (${NAME}) at ${slug}`);
    }
  }
}
