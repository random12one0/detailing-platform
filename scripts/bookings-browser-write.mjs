// ROADMAP 8.10d — a detailer's browser can no longer write `bookings`
// directly, and the job record's own edit still saves. Proved in a browser,
// signed in as the demo owner, against the LIVE grant (migration
// 20261006040000, applied 2026-10-10).
//
//   node scripts/bookings-browser-write.mjs                 # dev server + DEMO_OWNER_PW + service key
//   node scripts/bookings-browser-write.mjs --break=stuck   # sabotage: the probe is aimed at customers.notes, which an owner DOES write, so "refused" must go red
//   node scripts/bookings-browser-write.mjs --break=nosave  # sabotage: Back instead of Save, so "the edit stuck" must go red
//
// Per width it asks, of one real demo booking:
//   * the page's own client (`/src/lib/supabase.js`, the app's module, the
//     owner's real session) is signed in and can READ the row — so a refusal
//     below is the grant, not an anonymous or broken client;
//   * a direct `update` of `weather`/`weather_at` is refused 42501 and the row
//     is unchanged when the service role reads it back;
//   * so is a direct `update` of an ordinary field (`admin_notes`) — 8.10d's
//     amended done-when: the browser updates no column at all;
//   * Edit -> Private notes -> Save, the dashboard's path through
//     `update-booking`, DOES change `admin_notes`, and leaves `weather` alone;
//   * the console is clean outside the probe, and inside it carries only the
//     probe's own refusals.
// It writes ONE field on ONE demo booking (`admin_notes`) and puts the original
// back with the service role before it exits. A note-only save sends no email
// (`update-booking` emails only on a cancel or a real move) and one
// "Booking updated" push to the demo owner's own devices.
// One canary runs every time: the grader is handed a reading where the direct
// write went through and the edit did not, and must fail it.
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { writeReceipt, REPO } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { demoOwner } from "./lib/demoOwner.mjs";
import "../tests/_env.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
const started_at = new Date().toISOString();
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").split("=")[1] || process.env.BREAK || "";
const BASE = process.env.BASE || "http://localhost:5173";
const OWNER = demoOwner();
const SIZES = [{ w: 1440, h: 900 }, { w: 392, h: 844 }];
const PER_WIDTH = 8;
const ART = "artifacts/bookings-browser-write";
mkdirSync(path.join(REPO, ART), { recursive: true });

let assertions = 0;
const failures = [];
const artifacts = [];
const noise = [];
const check = (label, name, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label} ${name}${detail ? " — " + detail : ""}`);
  console.log(`  ${ok ? "ok  " : "FAIL"} ${label} ${name}${detail ? " — " + detail : ""}`);
};

const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_?.includes("kguqylyzgyzfktkfnhjb")) { console.error("not this platform's project — refusing"); process.exit(1); }
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const rest = async (q) => (await fetch(`${URL_}/rest/v1/${q}`, { headers: H })).json();
const patch = (q, body) => fetch(`${URL_}/rest/v1/${q}`, { method: "PATCH", headers: H, body: JSON.stringify(body) });
const ROW = "id,admin_notes,weather,weather_at,customer_id";
const read = async (id) => (await rest(`bookings?select=${ROW}&id=eq.${id}`))[0];

const [biz] = await rest("businesses?select=id&slug=eq.demo-detail");
const [job] = biz ? await rest(`bookings?select=${ROW}&business_id=eq.${biz.id}&deleted_at=is.null` +
  `&status=in.(confirmed,pending)&customer_id=not.is.null&start_at=gte.${new Date().toISOString()}&order=start_at.asc&limit=1`) : [];
const [cust] = job ? await rest(`customers?select=id,notes&id=eq.${job.customer_id}`) : [];
check("setup", "an upcoming demo booking with a customer", !!(job && cust), job?.id ?? "none");
const original = job && { admin_notes: job.admin_notes, weather: job.weather, weather_at: job.weather_at };
const custNotes = cust?.notes ?? null;

/** In the page: the app's own client, the owner's own session. */
const PROBE = async ({ id, tag, aim }) => {
  const { supabase } = await import("/src/lib/supabase.js");
  const { data: s } = await supabase.auth.getSession();
  const seen = await supabase.from("bookings").select("id").eq("id", id).maybeSingle();
  const tryIt = (body) => aim.table === "bookings"
    ? supabase.from("bookings").update(body).eq("id", id).select("id")
    : supabase.from(aim.table).update({ notes: tag }).eq("id", aim.id).select("id");
  const w = await tryIt({ weather: { t: 99, probe: tag }, weather_at: new Date().toISOString() });
  const n = await tryIt({ admin_notes: tag });
  return { email: s?.session?.user?.email ?? null, readOk: seen.data?.id === id,
    weather: { code: w.error?.code ?? null, rows: w.data?.length ?? 0 },
    notes: { code: n.error?.code ?? null, rows: n.data?.length ?? 0 } };
};

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

export function grade(label, r) {
  check(label, "client/signed-in-and-reads", r.email === OWNER.email && r.readOk, `${r.email} read ${r.readOk}`);
  check(label, "direct-weather/refused", r.weather.code === "42501" && r.weather.rows === 0, JSON.stringify(r.weather));
  check(label, "direct-weather/row-unchanged", r.weatherUnchanged, r.weatherUnchanged ? "" : "the probe's weather stuck");
  check(label, "direct-ordinary-field/refused", r.notes.code === "42501" && r.notes.rows === 0 && r.notesUnchanged,
    `${JSON.stringify(r.notes)} unchanged ${r.notesUnchanged}`);
  check(label, "edit-through-save/stuck", r.saved, r.savedDetail);
  check(label, "edit-through-save/weather-untouched", r.weatherAfterSave, "");
  check(label, "console/clean-outside-probe", r.outside.length === 0, r.outside.join(" | "));
  check(label, "console/probe-only-its-refusals", r.inside.length > 0 && r.inside.every((n) => /\b403\b/.test(n)),
    r.inside.join(" | ") || "the probe left no trace at all");
}

const browser = await chromium.launch();
let signedIn = null;
try {
  if (job && cust) for (const size of SIZES) {
    const label = `${size.w}x${size.h}`;
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    const start = noise.length;
    watchConsole(page, label, noise);
    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email], .tabbar", { timeout: 30000 });
    if (await page.locator("input[type=email]").count()) {
      await page.fill("input[type=email]", OWNER.email);
      await page.fill("input[type=password]", OWNER.password);
      await page.click("form button.btn.primary");
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      signedIn = await ctx.storageState();
    }
    await page.evaluate(() => {
      try {
        localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"]));
        localStorage.setItem("dp.tour", "1");
      } catch { /* private mode */ }
    });
    await page.goto(`${BASE}/job/${job.id}`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".jobbar a[href^='tel:']", { timeout: 30000 });
    await page.waitForLoadState("networkidle").catch(() => {});
    await settle(page);

    // The refused half.
    const tag = `8.10d probe ${label} ${Date.now()}`;
    const aim = BREAK === "stuck" ? { table: "customers", id: cust.id } : { table: "bookings" };
    const before = noise.length;
    const r = await page.evaluate(PROBE, { id: job.id, tag, aim });
    await page.waitForTimeout(300); // the response listener lands after the fetch resolves
    const inside = noise.slice(before);
    const mid = await read(job.id);
    const custMid = (await rest(`customers?select=notes&id=eq.${cust.id}`))[0];
    r.weatherUnchanged = BREAK === "stuck" ? custMid.notes !== tag
      : same(mid.weather, original.weather) && same(mid.weather_at, original.weather_at);
    r.notesUnchanged = BREAK === "stuck" ? custMid.notes !== tag : same(mid.admin_notes, original.admin_notes);

    // The working half: the dashboard's own edit, through update-booking.
    const note = `8.10d saved ${label} ${Date.now()}`;
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const box = page.locator("label.field", { hasText: "Private notes" }).locator("textarea");
    await box.fill(note);
    await settle(page);
    await page.screenshot({ path: path.join(REPO, ART, `${label}-editing.png`) });
    artifacts.push(`${ART}/${label}-editing.png`);
    await page.getByRole("button", { name: BREAK === "nosave" ? "Back" : "Save", exact: true }).click();
    let after = mid;
    for (let i = 0; i < 40 && after.admin_notes !== note; i++) { await page.waitForTimeout(250); after = await read(job.id); }
    r.saved = after.admin_notes === note;
    r.savedDetail = `admin_notes now ${JSON.stringify(after.admin_notes)}`;
    r.weatherAfterSave = same(after.weather, original.weather);
    await page.waitForLoadState("networkidle").catch(() => {});
    await settle(page);
    await page.screenshot({ path: path.join(REPO, ART, `${label}-saved.png`) });
    artifacts.push(`${ART}/${label}-saved.png`);
    r.outside = [...noise.slice(start, before), ...noise.slice(before + inside.length)];
    r.inside = inside;
    await ctx.close();

    // Put the row back before the next width reads it as "original".
    await patch(`bookings?id=eq.${job.id}`, { admin_notes: original.admin_notes });
    if (BREAK === "stuck") await patch(`customers?id=eq.${cust.id}`, { notes: custNotes });
    grade(label, r);
  }
} finally {
  await browser.close();
  if (job) {
    await patch(`bookings?id=eq.${job.id}`, { admin_notes: original.admin_notes });
    await patch(`customers?id=eq.${cust.id}`, { notes: custNotes });
    const back = await read(job.id);
    const restored = same(back.admin_notes, original.admin_notes) && same(back.weather, original.weather);
    console.log(`restored: ${restored ? "yes" : "NO — " + JSON.stringify(back)}`);
    if (!restored) failures.push(`teardown the demo booking ${job.id} was not put back`);
  }
}

// The canary: the hole as it was on 2026-10-06 must fail the grader.
const keep = { a: assertions, f: failures.length };
grade("canary", { email: OWNER.email, readOk: true, weather: { code: null, rows: 1 }, notes: { code: null, rows: 1 },
  weatherUnchanged: false, notesUnchanged: false, saved: false, savedDetail: "", weatherAfterSave: true, outside: [], inside: [] });
const canaryCaught = failures.length >= keep.f + 4;
failures.splice(keep.f);
assertions = keep.a;

const ran = job && cust ? SIZES.length : 0;
const expected = SIZES.length * PER_WIDTH + 1;
const lines = [`${assertions} assertions (declared ${expected}), ${failures.length} failed`, ...failures,
  `canary the-open-door: ${canaryCaught ? "caught" : "MISSED"}`, ...noise.map((n) => "console: " + n)];
console.log(lines.join("\n"));
const txt = `${ART}/report${BREAK ? ".sabotage" : ""}.txt`;
writeFileSync(path.join(REPO, txt), lines.join("\n") + "\n");
artifacts.push(txt);
const okRun = failures.length === 0 && canaryCaught && assertions === expected;
const { path: rp, receipt } = writeReceipt({
  check_id: "bookings-browser-write", started_at, status: okRun ? "pass" : "fail",
  expected_targets: SIZES.length, discovered_targets: ran, attempted_targets: ran, completed_targets: ran, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: expected - 1,
  failures, warnings: [], artifacts,
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), break: BREAK || null, booking: job?.id ?? null },
  canary: { id: "the-open-door", observed_failure: canaryCaught },
});
console.log("receipt: " + path.relative(REPO, rp) + " (" + receipt.status + ")");
process.exit(okRun ? 0 : 1);
