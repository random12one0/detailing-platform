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
// Resend's own `delivered@resend.dev` simulator — the same address roadmap 0.3
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

const BASE = "http://localhost:5173";
const KEEP = process.argv.includes("--keep");
const HEADED = process.argv.includes("--headed");
const ONLY = process.argv.find((a) => a.startsWith("--slug="))?.slice(7);
// Resend's delivery simulator. Reputation-free and, unlike a reserved domain,
// it goes all the way to the provider — which is the difference between "the
// relay was called" and "the email left the building".
const CUSTOMER_EMAIL = process.argv.find((a) => a.startsWith("--to="))?.slice(5)
  ?? "delivered@resend.dev";
// Far enough out to clear both tenants' cancellation windows (24h and 48h)
// with room. A booking inside the window is refused by the server AND the
// receipt page does not draw the buttons, so the last two legs would report a
// missing control rather than a broken one.
const MIN_LEAD_DAYS = 3;

const TENANTS = [
  { slug: "demo-detail", dashboard: { email: "demo@detailplatform.com", password: "demo123" } },
  { slug: "demo-riverside", dashboard: null },
].filter((t) => !ONLY || t.slug === ONLY);

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`); }
};
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
async function logs(table, sinceMicros) {
  if (!MGMT || !REF) return null;
  const sql = `select timestamp, event_message from ${table} order by timestamp desc limit 100`;
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${REF}/analytics/endpoints/logs.all?sql=${encodeURIComponent(sql)}`,
    { headers: { Authorization: `Bearer ${MGMT}` } },
  );
  if (!res.ok) return null;
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

const browser = await chromium.launch({ headless: !HEADED });
for (const tenant of TENANTS) await loop(tenant);
await browser.close();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

// ===========================================================================
async function loop({ slug, dashboard }) {
  const runId = Date.now().toString(36).slice(-5).toUpperCase();
  const NAME = `Smoke ${runId}`;
  // Unique per run, because create-booking upserts the customer BY PHONE
  // within a business — a fixed number would attach every run to one customer
  // row and the cleanup would delete a row the next run is still using.
  const PHONE = `555-01${String(Date.now() % 100).padStart(2, "0")}`;

  const biz = (await db.get(`/rest/v1/businesses?slug=eq.${slug}&select=id,name,contact_email,timezone`)).data?.[0];
  if (!biz) {
    fail++;
    console.error(`\nFAIL  no business with slug ${slug} — run the seed scripts`);
    return;
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
  const [DATE] = openDay;
  // The TIME is not decided here. `available-slots` answers with three lists —
  // all slots, drop-off slots and mobile slots — and the step shows whichever
  // matches the service type the customer ended up with, so a time chosen from
  // the wrong list is a chip that is not on the screen. Click what is offered
  // and read it back; every later assertion uses that.
  let TIME = null;

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
        ok(`${DATE} is open on the customer's calendar`,
          await cell.count() > 0 && !/closed/.test((await cell.getAttribute("class")) ?? ""),
          await cell.getAttribute("class").catch(() => "no cell"));
        await cell.click();
        await page.locator(".bk-slots .bk-chip").first().waitFor({ state: "attached", timeout: 10000 });
        await settle(page, 900);
        const chip = page.locator(".bk-slots .bk-chip").first();
        TIME = time24(await chip.innerText());
        ok(`a time is offered on that day (${TIME})`, !!TIME);
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
        for (const [sel, value] of [
          [".bk-field input[type=tel]", PHONE],
          [".bk-field input[type=email]", CUSTOMER_EMAIL],
        ]) {
          if (await page.locator(sel).count()) await page.locator(sel).fill(value);
        }
        const text = page.locator(".bk-field input:not([type=tel]):not([type=email])").first();
        if (await text.count() && !(await text.inputValue())) {
          await text.fill(/reach you/i.test(head) ? NAME : "140 Market Street, Long Beach, CA");
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
    ok("the review step prints a total", /^\$\d[\d,]*\.\d\d$/.test(bar), bar);

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

    const done = await page.locator(".bk-wrap h1").innerText().catch(() => "");
    ok("the confirmation screen says what happened",
      isRequest ? /holding your time/i.test(done) : /booked/i.test(done), done);
    const receiptPath = await page.evaluate(() => {
      const a = [...document.querySelectorAll("a")].map((x) => x.href).find((h) => h && h.includes("/booking/"));
      return a ? new URL(a).pathname : null;
    });
    ok("it links to the receipt", !!receiptPath?.startsWith("/booking/"), String(receiptPath));
    bookingId = receiptPath?.split("/").pop() ?? null;

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
      + "&select=id,status,start_at,total_price,customer_name,customer_email",
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
      `$${Number(row?.total_price).toFixed(2)}` === bar, `bar ${bar}, row ${row?.total_price}`);

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
        console.log("  skip  edge-function logs need SUPABASE_ACCESS_TOKEN and SUPABASE_PROJECT_REF");
      } else {
        const said = ((await logs("function_logs", t0)) ?? []).map((r) => r.event_message).join("\n");
        const sends = edge.filter((r) => /\/send-email/.test(r.event_message));
        ok("the relay was called twice — one customer, one owner", sends.length >= 2, `${sends.length} call(s)`);
        // A non-2xx from Resend makes send-email answer non-200 and log
        // "Resend API error", so these two together are the whole of the
        // question "did it leave the building".
        ok("and answered 200 every time", sends.every((r) => / 200 /.test(r.event_message)),
          sends.map((r) => r.event_message).join(" | "));
        ok("the provider took it", !/Resend API error|relay failed|relay error/i.test(said),
          (said.match(/(?:Resend API error|relay (?:failed|error)).*/i) ?? [""])[0]);
        for (const [who, to] of [["customer", CUSTOMER_EMAIL], ["owner", ownerTo]]) {
          if (undeliverable(to)) {
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
    const slotsOn = async (date) => {
      const r = await fn("available-slots", {
        business_slug: slug, booking_date: date,
        duration_minutes: service.duration_minutes, service_ids: [service.id],
      });
      return r.data?.slots ?? [];
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
      ok(`the booked day (${wantDay}) is offered to move within`, await dayChip.count() > 0);
      await (await dayChip.count() ? dayChip : page.locator(".bk-slots").first().locator(".bk-chip").first()).click();
      await settle(page, 1800);
      // Whatever it offers, minus the time it is already on — the buffer takes
      // the slots either side of a live booking, so the free time on this day
      // is not the one next to it and picking a number in advance is guesswork.
      const times = page.locator(".bk-slots").nth(1).locator(".bk-chip");
      let timeChip = null;
      for (const c of await times.all()) {
        if (time24(await c.innerText()) !== TIME) { timeChip = c; break; }
      }
      ok("a different time is offered on that day", !!timeChip,
        (await times.allInnerTexts()).join(" ") || "no time chips");
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
        ok(`the old time ${TIME} is free again`, free.includes(TIME), free.join(" "));
        ok(`and ${MOVED} is taken`, !free.includes(MOVED), free.join(" "));
        TIME = MOVED;
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
      ok(`the cancelled time ${TIME} is offered again`, free.includes(TIME), free.join(" "));
    }

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
