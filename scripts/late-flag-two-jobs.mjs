// TWO OPEN JOBS ON TODAY, ONE PAST ITS END AND ONE NOT — ONLY THE FIRST MAY READ "Late" — ROADMAP 14.24 part 2 (9.5's gap).
//
//   set -a; . ./.env; set +a
//   node scripts/late-flag-two-jobs.mjs
//   node scripts/late-flag-two-jobs.mjs --break=both-past     # sabotage (data): the "future" job is staged in the past too
//   node scripts/late-flag-two-jobs.mjs --break=blind         # sabotage: the Late label is hidden by CSS, so neither reads Late
//   node scripts/late-flag-two-jobs.mjs --break=always-late   # sabotage (CODE): Today.jsx's `end_at < now` is rewritten to `true` in the browser
//
// Needs the dev server (:5173), the seed, and `.env` loaded. Signs in as the demo tenant's OWNER.
//
// WHAT IT WRITES, SAID BEFORE IT DOES, to `demo-detail` on kguqylyzgyzfktkfnhjb (the script refuses any other project):
//   three `confirmed` DROP-OFF bookings dated today — drop-off so no address is ever geocoded (no Geoapify credit) and no
//   mail is sent — named "Late-Check Past" and "Late-Check Future", each with one booking_services row.
//   past   : ends an hour ago
//   future : starts an hour from now
//   later  : starts three hours from now   <- NOT IN THE ENTRY, AND IT IS THE ONE THAT MATTERS. Today.jsx's `lit` lifts the
//            first confirmed job that has not ended out of the list and draws it as the "Up next" CARD (BookingCard),
//            which has no Late flag and never runs the comparison. With only the entry's two rows, the future one is
//            that card, so the comparison is never asked about a not-yet-ended job — `--break=always-late` passes.
//            The third is drawn as an ordinary row, so the comparison IS asked, and answers "not late".
// and it DELETES them again, by id, in a `finally` — and by the marker name at the START of every run, because a `finally`
// does not run on SIGTERM (docs/gotchas.md 90) and a run killed halfway would otherwise leave two fake jobs on Andrew's
// Today screen. It aborts without writing if Pacific time is within two hours of midnight (the rows would land on another day).
//
// WHAT ELSE IT SPENDS, MEASURED WITH scripts/shared-resources-guard.mjs: Today at 1440 asks `available-slots` for its "open
// slots" figure, so a run moves 2 each of rate_hits/available-slots, address_ip, address_day and public_ceiling (2 because the
// dev server's StrictMode runs the effect twice). It touches no address-suggest bucket, so no Geoapify credit. Run it as
//   node scripts/shared-resources-guard.mjs run --mine=demo/bookings,demo/booking_services,rate_hits/available-slots,rate_hits/address_ip,rate_hits/address_day,rate_hits/public_ceiling -- node scripts/late-flag-two-jobs.mjs
//
// THE TRUTH IT RESTS ON: ROADMAP 9.5 flags `status === "confirmed" && end_at < now` in Today.jsx and nothing else. Its own
// write-up says the case that would catch an off-by-one — two open jobs side by side — was never on screen, and that the
// negatives it did get (a `completed` job, a future date) may never reach the same comparison. Both rows here are `confirmed`
// and both are today, so they reach exactly that comparison.
//
// WHAT IT ASSERTS, PER WIDTH (1440, 392) — 6, DECLARED RATHER THAN COUNTED (docs/gotchas.md 98)
//   both-listed     both rows are under "Still to do"
//   past-late       the past row carries a painted "Late"
//   future-not-late the future row carries none (it is the Up next card, which cannot)
//   later-not-late  the third row is drawn as a ROW and carries none — the comparison, asked about a job that has not ended
//   exactly-one     exactly one "Late" across the two rows
//   console         no error or warning beyond the ONE known 404 the gear's platform-admin whoami makes for a non-admin
//                   (docs/gotchas.md 120), and not more than once per page load
// plus once: staged-today (both rows read back with booking_date = today) and cleaned-up (neither row exists afterwards, and
// the demo's booking count is what it was before). Plus 2 canaries. 2 x 6 + 2 + 2 = 16, asserted as an EQUALITY.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const BASE = process.env.BASE || "http://localhost:5173";
const ART = join(REPO, ".manager-shots", "14.24");
const BREAK = (process.argv.slice(2).find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const EXPECTED_ASSERTIONS = SIZES.length * 6 + 2 + 2;
const PAST = "Late-Check Past", FUTURE = "Late-Check Future", LATER = "Late-Check Later";
const SLUG = "demo-detail", TZ = "America/Los_Angeles";

const { SUPABASE_URL: URL_, SUPABASE_SERVICE_ROLE_KEY: SR } = process.env;
if (!URL_ || !SR) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run `set -a; . ./.env; set +a` first.\nNOTHING WAS MEASURED. This is not a pass."); process.exit(2); }
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) { console.error(`refusing: SUPABASE_URL is not kguqylyzgyzfktkfnhjb (${URL_})`); process.exit(2); }
const H = { apikey: SR, Authorization: `Bearer ${SR}`, "Content-Type": "application/json", Prefer: "return=representation" };
const api = async (method, path, body) => {
  const r = await fetch(URL_ + path, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  if (r.status >= 300) throw new Error(`${method} ${path} -> ${r.status} ${text.slice(0, 200)}`);
  return text ? JSON.parse(text) : null;
};

// PURE RULES, so the canaries run through the same code the readings do (gotchas 95).
const rowOf = (rows, name) => rows.find((r) => r.name.includes(name));
const bothListed = (rows) => !!rowOf(rows, PAST) && !!rowOf(rows, FUTURE) && rowOf(rows, PAST).section === "Still to do" && rowOf(rows, FUTURE).section === "Still to do";
const pastLate = (rows) => !!rowOf(rows, PAST)?.late;
const futureNotLate = (rows) => !!rowOf(rows, FUTURE) && !rowOf(rows, FUTURE).late;
const laterNotLate = (rows) => rowOf(rows, LATER)?.kind === "row" && !rowOf(rows, LATER).late;
const exactlyOne = (rows) => [PAST, FUTURE].filter((n) => rowOf(rows, n)?.late).length === 1;

const pacificDate = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const pacificHour = (d) => Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(d));
const iso = (ms) => new Date(ms).toISOString();

async function business() {
  const [b] = await api("GET", `/rest/v1/businesses?slug=eq.${SLUG}&select=id`);
  if (!b) throw new Error(`no business with slug ${SLUG}`);
  return b.id;
}
const count = async (bid) => (await api("GET", `/rest/v1/bookings?business_id=eq.${bid}&select=id`)).length;
async function sweep(bid) {
  const left = await api("GET", `/rest/v1/bookings?business_id=eq.${bid}&customer_name=like.Late-Check%25&select=id`);
  for (const b of left) {
    await api("DELETE", `/rest/v1/booking_services?booking_id=eq.${b.id}`);
    await api("DELETE", `/rest/v1/bookings?id=eq.${b.id}`);
  }
  return left.length;
}

const READ_ROWS = () => {
  let section = "";
  const out = [];
  // A JOB IS DRAWN TWO WAYS: a `.row-item` (JobRow, which can carry the flag) or, for the ONE job `lit` picks — the first
  // confirmed job that has not ended — a `.card.attend` (BookingCard, which has no flag at all). Both are read.
  for (const el of document.querySelectorAll("h2.label, .row-item, .card.attend")) {
    if (el.matches("h2.label")) { section = el.textContent.trim(); continue; }
    const nm = el.querySelector(".nm");
    const late = el.querySelector(".late");
    out.push({
      kind: el.matches(".card.attend") ? "next-card" : "row",
      pill: (el.querySelector(".pill") || {}).textContent || "",
      section, name: nm ? nm.textContent : el.textContent,
      late: !!late && late.offsetHeight > 0 && getComputedStyle(late).visibility !== "hidden" && /late/i.test(late.textContent),
    });
  }
  return out.filter((r) => /Late-Check/.test(r.name));
};

let assertions = 0;
const failures = [], canaries = [], sabotage = [], observed = [], artifacts = [];
const ok = (cond, id, detail) => {
  assertions++; observed.push({ id, ok: !!cond, detail });
  if (!cond) failures.push(`${id} — ${detail}`);
  console.log(`${cond ? "  ok  " : "  FAIL"} ${id}  ${detail}`);
};

async function run() {
  mkdirSync(ART, { recursive: true });
  const bid = await business();
  const swept = await sweep(bid);
  console.log(`business ${SLUG} (${bid.slice(0, 8)}…); leftovers from an earlier killed run swept: ${swept}`);
  const before = await count(bid);

  const now = Date.now();
  const hr = pacificHour(new Date(now));
  if (hr < 2 || hr >= 20) { console.error(`NOT RUN: it is ${hr}:xx Pacific, too close to midnight for jobs from two hours ago to four hours ahead to land on today.\nNOTHING WAS MEASURED. This is not a pass.`); process.exit(2); }
  const today = pacificDate(new Date(now));
  const [svc] = await api("GET", `/rest/v1/services?business_id=eq.${bid}&is_active=eq.true&select=id,name,price,duration_minutes&order=created_at.asc&limit=1`);
  if (!svc) throw new Error("the demo tenant has no active service");
  const stage = (name, startMs) => ({
    business_id: bid, customer_name: name, customer_phone: "5625550100", customer_email: "late-check@example.com",
    start_at: iso(startMs), end_at: iso(startMs + 60 * 60000),
    service_type: "dropoff", vehicle_size: "small", vehicle_size_fee: 0,
    subtotal: Number(svc.price), total_price: Number(svc.price), status: "confirmed", payment_status: "pending",
  });
  const futureStart = BREAK === "both-past" ? now - 120 * 60000 : now + 60 * 60000;
  const rows = [stage(PAST, now - 120 * 60000), stage(FUTURE, futureStart), stage(LATER, now + 180 * 60000)];
  console.log(`WRITING to ${SLUG}: "${PAST}" ends ${iso(now - 60 * 60000)}, "${FUTURE}" starts ${iso(futureStart)}, "${LATER}" starts ${iso(now + 180 * 60000)}; all confirmed, drop-off, service "${svc.name}".`);

  const browser = await chromium.launch();
  let cleaned = false;
  const cleanup = async () => { if (!cleaned) { cleaned = true; await sweep(bid); } };
  for (const sig of ["SIGINT", "SIGTERM"]) process.on(sig, async () => { await cleanup(); process.exit(130); });
  try {
    const made = await api("POST", "/rest/v1/bookings", rows);
    for (const b of made) await api("POST", "/rest/v1/booking_services", [{
      business_id: bid, booking_id: b.id, service_id: svc.id, name_at_booking: svc.name,
      price_at_booking: Number(svc.price), duration_at_booking: Number(svc.duration_minutes),
    }]);
    const back = await api("GET", `/rest/v1/bookings?business_id=eq.${bid}&customer_name=like.Late-Check%25&select=customer_name,start_at,status`);
    // `booking_date` is not a column: the app derives it from start_at in the business's timezone (useBookings.js), so this does too.
    const day = (b) => pacificDate(new Date(b.start_at));
    ok(back.length === 3 && back.every((b) => day(b) === today && b.status === "confirmed"), "staged-today",
      `read back ${back.length} rows: ${back.map((b) => `${b.customer_name} ${day(b)} ${b.status}`).join("; ")}; today is ${today} Pacific`);

    for (const { w, h } of SIZES) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h } });
      const page = await ctx.newPage();
      const noise = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") noise.push(`${m.type()} · ${m.text().slice(0, 160)}`); });
      page.on("pageerror", (e) => noise.push(`pageerror · ${String(e.message).slice(0, 160)}`));
      page.on("response", (r) => { if (r.status() >= 400) { let p = r.url(); try { p = new URL(p).pathname; } catch { /* raw */ } noise.push(`http ${r.status()} · ${p}`); } });

      let rewrote = 0, served = 0;
      if (BREAK === "always-late") {
        // Today.jsx is served by Vite as transformed JS; the one place `end_at < nowIso` is compared is the flag.
        await page.route("**/src/screens/Today.jsx*", async (route) => {
          const res = await route.fetch();
          let body = await res.text();
          served++;
          body = body.replace(/(\bb\.end_at\s*<\s*nowIso)/g, () => { rewrote++; return "true"; });
          await route.fulfill({ response: res, body });
        });
      }
      await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 30000 });
      await page.fill("input[type=email]", demoOwnerEmail);
      await page.fill("input[type=password]", demoOwner().password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await page.waitForFunction(() => [...document.querySelectorAll(".row-item, .card.attend")].some((e) => /Late-Check/.test(e.textContent)), null, { timeout: 25000 })
        .catch(() => {});
      await page.waitForTimeout(800);
      if (BREAK === "blind") await page.addStyleTag({ content: ".late{display:none!important}" });
      if (BREAK === "always-late") {
        sabotage.push({ width: w, break: BREAK, served, rewrote, landed: served >= 1 && rewrote >= 1 });
        if (!(served >= 1 && rewrote >= 1)) { console.error(`SABOTAGE DID NOT LAND at ${w}: Today.jsx served ${served}x, ${rewrote} comparison(s) rewritten`); process.exit(2); }
      }
      const read = await page.evaluate(READ_ROWS);
      if (BREAK === "blind") {
        const hidden = await page.evaluate(() => [...document.querySelectorAll(".late")].every((e) => e.offsetHeight === 0));
        sabotage.push({ width: w, break: BREAK, landed: hidden });
        if (!hidden) { console.error(`SABOTAGE DID NOT LAND at ${w}`); process.exit(2); }
      }
      console.log(`  ${w}: rows read -> ${read.map((r) => `[${r.section}] ${r.kind}${r.pill ? ` "${r.pill}"` : ""} ${r.name.trim().slice(0, 40)} late=${r.late}`).join(" | ") || "NONE"}`);
      const shot = `today-late-${w}${BREAK ? "-" + BREAK : ""}.png`;
      await page.locator(".row-item, .card.attend", { hasText: PAST }).first().scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: join(ART, shot), animations: "disabled" });
      if (!BREAK) artifacts.push(`.manager-shots/14.24/${shot}`);

      ok(bothListed(read), `${w}/both-listed`, `under "Still to do": ${read.map((r) => `${r.name.trim().slice(0, 40)} in "${r.section}" as ${r.kind}`).join("; ") || "no Late-Check row on the page at all"}`);
      ok(pastLate(read), `${w}/past-late`, `"${PAST}" late=${rowOf(read, PAST)?.late}`);
      ok(futureNotLate(read), `${w}/future-not-late`, `"${FUTURE}" late=${rowOf(read, FUTURE)?.late}, drawn as ${rowOf(read, FUTURE)?.kind} "${rowOf(read, FUTURE)?.pill}"`);
      ok(laterNotLate(read), `${w}/later-not-late`, `"${LATER}" late=${rowOf(read, LATER)?.late}, drawn as ${rowOf(read, LATER)?.kind}`);
      ok(exactlyOne(read), `${w}/exactly-one`, `${read.filter((r) => r.late).length} of ${read.length} rows read Late`);
      const known = noise.filter((m) => /^http 404 · .*whoami/.test(m));
      const other = noise.filter((m) => !/^http 404 · .*whoami/.test(m) && !/Failed to load resource: the server responded with a status of 404/.test(m));
      ok(other.length === 0 && known.length <= 1, `${w}/console`, other.length ? other.slice(0, 3).join(" | ")
        : `0 unexpected; ${known.length} known platform-admin whoami 404 (gotchas 120)`);
      await ctx.close();
    }
  } finally {
    await cleanup();
    await browser.close();
  }
  const left = await api("GET", `/rest/v1/bookings?business_id=eq.${bid}&customer_name=like.Late-Check%25&select=id`);
  const after = await count(bid);
  ok(left.length === 0 && after === before, "cleaned-up", `${left.length} Late-Check rows remain; demo bookings ${before} before, ${after} after`);

  const c1 = exactlyOne([{ name: PAST, late: true }, { name: FUTURE, late: true }]);
  canaries.push({ name: "both-read-late", flagged: !c1 });
  ok(!c1, "canary/both-read-late", "two rows that BOTH read Late must NOT read as 'exactly one'");
  const c2 = pastLate([{ name: PAST, late: false }, { name: FUTURE, late: false }]);
  canaries.push({ name: "neither-reads-late", flagged: !c2 });
  ok(!c2, "canary/neither-reads-late", "a past row that reads nothing must NOT read as 'the past one is Late'");
  if (assertions !== EXPECTED_ASSERTIONS) failures.push(`assertion count ${assertions} != declared ${EXPECTED_ASSERTIONS}`);

  const status = failures.length ? "fail" : "pass";
  const { path } = writeReceipt({
    check_id: "late-flag-two-jobs",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status,
    expected_targets: SIZES.length, discovered_targets: SIZES.length, attempted_targets: SIZES.length,
    completed_targets: SIZES.length, skipped_targets: 0,
    assertions_executed: assertions, min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor: "2 widths x 6 + staged-today + cleaned-up + 2 canaries = 16, asserted as an EQUALITY (docs/gotchas.md 98).",
    failures, warnings: [], artifacts,
    dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), business: SLUG, item: "14.24-2", break: BREAK },
    canary: { id: canaries[0].name, observed_failure: canaries.every((c) => c.flagged) },
    canaries, unjudgeable: [], sabotage, observed,
  });
  console.log(`\nreceipt: ${path}`);
  console.log(`${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed`);
  process.exit(failures.length ? 1 : 0);
}
run().catch(async (e) => {
  console.error(e); console.error("NOTHING WAS MEASURED. This is not a pass.");
  try { await sweep(await business()); } catch { /* the next run sweeps at its start */ }
  process.exit(2);
});
