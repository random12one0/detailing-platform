// STUDIO S2 — THE CONNECTION CHECK (STUDIO-SPEC.md §2c, layers 2 and 3).
//
//   node scripts/studio/studio-check.mjs [--spec <revision.json>] [--seed <snapshot.json>]
//        [--out <result.json>] [--jsonl] [--revision <label>] [--shot <first-screen.png>] [--break=<kind>]
//
// Proves, on a throw-away copy of the detailer's dashboard, that a revision of
// their site holds no fact of its own:
//   1. starts the offline engine (belt-staging/demo-backend.mjs) IN THIS PROCESS,
//      seeded with a snapshot of the site's business (--seed; default the
//      Brightline example, the only business S2 has) — the real database is
//      never called;
//   2. draws the revision (--spec; default app/src/site/specs/brightline.json)
//      headless through the real renderer (/site/preview on a Vite dev server);
//   3. checks every data-from stamp on the page against the profile it came from;
//   4. makes five dashboard changes in the copy (a price +$5, a service hidden,
//      one day's hours, a photo removed, a review added), reloads, and confirms
//      each shows and nothing old remains;
//   5. books a practice job through the site on a fresh copy: the price shown
//      equals calculate-booking, the times offered equal available-slots, and
//      exactly one create-booking post is recorded;
//   6. throws the copy away, and confirms no data request left the laptop.
//
// Output: one human line per tick (or one JSON line each with --jsonl), and the
// whole tick list as JSON in --out (default artifacts/studio-check/result.json).
// Exit 0 when every tick is green, 1 otherwise.
//
// --break=<kind> cuts the wire on purpose, for tests/studio-check.test.mjs:
//   missing-id    the revision's menu points at a service group the dashboard lacks
//   wrong-stamp   the page claims one service's price is another's
//   frozen-price  the page keeps the first prices it drew (a site holding its own copy)
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL, fileURLToPath } from "node:url";
import path from "node:path";
import net from "node:net";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APP = path.join(ROOT, "app");
const arg = (k) => { const a = process.argv.find((x) => x.startsWith(`--${k}=`)); if (a) return a.slice(k.length + 3); const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const SPEC_FILE = path.resolve(arg("spec") || path.join(APP, "src/site/specs/brightline.json"));
const OUT_FILE = path.resolve(arg("out") || path.join(ROOT, "artifacts/studio-check/result.json"));
const JSONL = process.argv.includes("--jsonl");
const BREAK = arg("break");
const LABEL = arg("revision") || path.basename(SPEC_FILE);
const SHOT = arg("shot") ? path.resolve(arg("shot")) : null;
const t0 = Date.now();

const { chromium } = createRequire(path.join(APP, "package.json"))("playwright");
const { exampleSeed, BELT } = await import(pathToFileURL(path.join(ROOT, "scripts/studio/example-engine.mjs")).href);
const { startDemoBackend } = await import(pathToFileURL(path.join(BELT, "demo-backend.mjs")).href);
const { walkBooking, hhmm } = await import(pathToFileURL(path.join(ROOT, "scripts/studio/booking-walk.mjs")).href);
const { validateSpec, parseBinding, resolve, bindingsOf } = await import(pathToFileURL(path.join(APP, "src/site/spec.js")).href);
const { normalizeProfile, createBookingTransport, slotsForType } = await import(pathToFileURL(path.join(APP, "src/book/core.js")).href);
const F = await import(pathToFileURL(path.join(APP, "src/lib/format.js")).href);

const lines = [];
function line(id, says, pass, detail = "") {
  const l = { id, says, pass: !!pass, detail: typeof detail === "string" ? detail : JSON.stringify(detail) };
  lines.push(l);
  console.log(JSONL ? JSON.stringify({ line: l }) : `${l.pass ? "PASS" : "FAIL"}  ${says}${l.detail ? ` — ${l.detail}` : ""}`);
  return l.pass;
}
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };
const n = (k, w) => `${k} ${w}${k === 1 ? "" : "s"}`;
const flat = (s) => String(s || "").replace(/\s+/g, " ").trim();
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const photoUrls = (g) => [g.after_url, g.before_url, g.image_url].filter(Boolean);
const dayLine = (h) => `${DAYS[h.weekday]} ${h.open_time && h.close_time ? `${F.time12(h.open_time)} – ${F.time12(h.close_time)}` : "Closed"}`;

// ---------------------------------------------------------------- layer 2: one stamp against the profile
// Returns null when the element shows what the profile says, else why not.
function stampProblem(st, p) {
  const b = parseBinding(st.from);
  if (!b) return `"${st.from}" is not an allowed binding`;
  let v;
  try { v = resolve(st.from, p); } catch (e) { return e.message; }
  const has = (s) => st.text.includes(flat(s));
  switch (b.kind) {
    case "service": {
      if (!v) return `no active service ${b.id} in the dashboard`;
      const s = v.service;
      if (b.field === "price" && !has(F.money(s.price))) return `shows "${st.text}", the dashboard says ${F.money(s.price)}`;
      if (b.field === "name" && st.text !== flat(s.name)) return `shows "${st.text}", the dashboard says "${s.name}"`;
      if (b.field === "duration" && !has(F.duration(s.duration_minutes))) return `shows "${st.text}", the dashboard says ${F.duration(s.duration_minutes)}`;
      if (b.field === "description" && !has(s.description)) return "the description differs from the dashboard";
      return null;
    }
    case "service_group": {
      if (!v) return `no service group ${b.id} with active services`;
      const miss = v.items.filter((s) => !has(s.name)).map((s) => s.name);
      return miss.length ? `missing ${miss.join(", ")}` : null;
    }
    case "gallery": return !v ? `no photo ${b.id} in the gallery` : photoUrls(v).some((u) => st.imgs.includes(u)) ? null : `photo ${b.id} is not the picture drawn`;
    case "gallery.best": {
      const want = v.flatMap(photoUrls), extra = st.imgs.filter((u) => !want.includes(u));
      const miss = v.filter((g) => !photoUrls(g).some((u) => st.imgs.includes(u)));
      return extra.length ? `draws a picture the gallery does not have: ${extra[0]}` : miss.length ? `${miss.length} gallery photo(s) not drawn` : null;
    }
    case "reviews.top": {
      const want = v.filter((r) => r.quote), miss = want.filter((r) => !has(r.quote));
      return miss.length ? `missing the review by ${miss[0].author}` : st.items !== want.length ? `draws ${st.items} reviews, the dashboard has ${want.length}` : null;
    }
    case "hours.week": {
      const miss = v.filter((h) => !has(dayLine(h))).map(dayLine);
      return miss.length ? `does not say "${miss[0]}"` : null;
    }
    case "contact.phone": {
      const d = String(v || "").replace(/\D/g, "");
      if (!d) return "the dashboard has no phone";
      return (st.href || "").replace(/\D/g, "").endsWith(d) || st.text.replace(/\D/g, "").includes(d) ? null : `does not lead to ${F.phone(v)}`;
    }
    case "sale": return !v ? "shows a sale the dashboard does not have" : has(`${v.percent}% off`) ? null : `does not say ${v.percent}% off`;
    case "area": return !v ? "shows an area the dashboard does not have" : v.text && !has(v.text) ? `does not say "${v.text}"` : null;
    case "add_ons": { const m = (v || []).filter((a) => !has(a.name)); return m.length ? `missing the add-on ${m[0].name}` : null; }
    case "plans": { const m = (v || []).filter((x) => !has(x.name)); return m.length ? `missing the plan ${m[0].name}` : null; }
    case "faq": { const m = (v || []).filter((x) => !has(x.q)); return m.length ? `missing the question "${m[0].q}"` : null; }
    case "pay": { const w = (x) => (x.key === "other" ? x.handle : x.label); const m = (v || []).filter((x) => !has(w(x))); return m.length ? `missing ${w(m[0])}` : null; }
    default: return null;
  }
}

// ---------------------------------------------------------------- the run
const spec = JSON.parse(readFileSync(SPEC_FILE, "utf8"));
if (BREAK === "missing-id") {
  const menu = spec.pages?.[0]?.sections?.find((s) => s.type === "catalog");
  if (menu?.group) menu.group.bind = "service_group:00000000-0000-4000-8000-000000000999";
}
const seed = arg("seed") ? JSON.parse(readFileSync(path.resolve(arg("seed")), "utf8")) : exampleSeed();

let engine = null, browser = null, vite = null;
const problems = [], outside = [];
try {
  // ---- 1. the private copy
  const biz = seed.tables?.businesses?.find((b) => b.slug === spec.slug);
  engine = await startDemoBackend({ port: 0, seed, platform: ROOT, quiet: true });
  const T = () => engine.db.tables;
  const api = createBookingTransport({ supabaseUrl: engine.url, anonKey: "demo-anon" });
  const profile = async () => normalizeProfile(await api.profile(spec.slug));
  let p = biz ? await profile().catch(() => null) : null;
  line("copy", `Copied ${biz?.name || "the business"}'s dashboard into a private test copy`, !!p?.business,
    p?.business ? `${n(p.services.length, "service")}, ${n(p.gallery.length, "photo")}, ${n(p.testimonials.length, "review")}, hours for ${n(p.hours.length, "day")}` : `no business with the slug ${spec.slug} in the snapshot`);

  // ---- 2. the revision against it
  const v = p ? validateSpec(spec, p) : { ok: false, errors: [{ message: "no dashboard copy to check against" }] };
  line("valid", "The revision fits the dashboard copy", v.ok, v.ok ? `${bindingsOf(spec).length} connections` : v.errors.map((e) => e.message).slice(0, 3).join("; "));

  // ---- the renderer, headless
  const port = await freePort();
  vite = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon" }, windowsHide: true, stdio: "ignore" });
  const SITE = `http://127.0.0.1:${port}/site/preview`;
  if (!(await until(() => fetch(SITE).then((r) => r.ok)))) throw new Error("the site renderer (Vite) never answered");
  browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await context.addInitScript((s) => { window.__STUDIO_SPEC__ = s; }, spec);
  if (BREAK === "wrong-stamp") await context.addInitScript(() => {
    new MutationObserver(() => {
      const st = [...document.querySelectorAll('[data-section] [data-from^="service:"][data-from$=".price"]')];
      const other = st.find((e) => e.dataset.from !== st[0]?.dataset.from);
      if (st[0] && other && !st[0].dataset.swapped) { st[0].dataset.swapped = "1"; st[0].dataset.from = other.dataset.from; }
    }).observe(document, { subtree: true, childList: true });
  });
  if (BREAK === "frozen-price") await context.addInitScript(() => {
    const keep = () => document.querySelectorAll('[data-from$=".price"]').forEach((e, i) => {
      const k = `frozen:${i}:${e.dataset.from}`, was = sessionStorage.getItem(k);
      if (was == null) sessionStorage.setItem(k, e.textContent); else if (e.textContent !== was) e.textContent = was;
    });
    new MutationObserver(keep).observe(document, { subtree: true, childList: true, characterData: true });
  });
  const page = await context.newPage();
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("request", (r) => { const h = new URL(r.url()).hostname; if (!["127.0.0.1", "localhost", "fonts.googleapis.com", "fonts.gstatic.com"].includes(h)) outside.push(r.url()); });
  const slotAnswers = [];
  page.on("response", async (r) => { if (r.url().includes("/functions/v1/available-slots")) { try { slotAnswers.push(await r.json()); } catch {} } });

  const load = async () => {
    await page.goto(SITE, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-booking-step="1"], .site-msg, [data-refused]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(250);
  };
  const stamps = () => page.evaluate(() => [...document.querySelectorAll("[data-from]")].map((e) => ({
    from: e.dataset.from, text: e.innerText.replace(/\s+/g, " ").trim(), href: e.getAttribute("href"),
    imgs: [...e.querySelectorAll("img")].map((i) => i.getAttribute("src")), items: e.querySelectorAll(":scope > li").length,
  })));
  const pageText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const verifyAll = async (id, says) => {
    const list = await stamps(), bad = [];
    for (const st of list) { const why = stampProblem(st, p); if (why) bad.push(`${st.from}: ${why}`); }
    return line(id, says, list.length > 0 && !bad.length, bad.slice(0, 3).join("; ") || `${n(list.length, "item")}, ${n(new Set(list.map((s) => s.from)).size, "different connection")}`);
  };

  await load();
  const drawn = await page.evaluate(() => ({ sections: [...document.querySelectorAll("[data-section]")].map((e) => e.dataset.section), refused: !!document.querySelector("[data-refused]"), h1: document.querySelectorAll("h1").length }));
  const wanted = (spec.pages?.[0]?.sections || []).map((s) => s.id);
  if (!line("drawn", `The site drew all ${wanted.length} sections`, !drawn.refused && wanted.every((s) => drawn.sections.includes(s)) && drawn.h1 === 1,
    drawn.refused ? "the page refused this revision" : drawn.h1 !== 1 ? `${drawn.h1} main headings, needs exactly one` : drawn.sections.join(", "))) {
    // Nothing below can be judged on a page that did not draw: each line says so at once instead of timing out.
    for (const [id, says] of [["stamps", "Every connected item shows what the dashboard says"], ["price", "Raise one price by $5"], ["hide", "Hide one service"],
      ["hours", "Change one day's hours"], ["photo", "Remove one photo"], ["review", "Add one review"], ["stamps-after", "After the changes, every connected item still matches the dashboard"],
      ["quote", "Practice booking: the price shown equals calculate-booking"], ["slots", "The times offered equal available-slots"],
      ["post", "One booking post recorded (create-booking)"]]) line(id, says, false, "not tried: the site did not draw");
    line("console", "The page showed no errors", !problems.length, problems.slice(0, 3).join(" | "));
    throw Object.assign(new Error("site not drawn"), { quiet: true });
  }
  if (SHOT) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900); await page.screenshot({ path: SHOT }).catch(() => {}); }
  await verifyAll("stamps", "Every connected item shows what the dashboard says");

  // ---- 3. five dashboard changes in the copy, one reload
  const before = await stamps();
  const pinned = new Set(bindingsOf(spec).map((b) => b.bind));
  const priceSt = before.find((s) => /^service:[^.]+\.price$/.test(s.from));
  const raised = priceSt && T().services.find((s) => `service:${s.id}.price` === priceSt.from);
  const oldPrice = raised && F.money(raised.price);
  const hidden = T().services.find((s) => s !== raised && s.is_active !== false && ![...pinned].some((b) => b.startsWith(`service:${s.id}`)) && before.some((st) => st.from.startsWith(`service:${s.id}.`)));
  const day = T().business_hours.find((h) => h.weekday === 6 && h.open_time) || T().business_hours.find((h) => h.open_time);
  const oldDay = day && dayLine(day);
  const shownImgs = before.flatMap((s) => s.imgs);
  const photo = T().gallery_images.find((g) => g.is_active !== false && photoUrls(g).some((u) => shownImgs.includes(u)));
  const review = { id: "00000000-0000-4000-8000-0000000007c1", business_id: biz?.id, author: "Check T.", rating: 5, source: "Connection check",
    quote: "A review the connection check added to the test copy.", sort_order: Math.min(0, ...T().testimonials.map((r) => r.sort_order ?? 0)) - 1, is_active: true };
  if (raised) raised.price = Number(raised.price) + 5;
  if (hidden) hidden.is_active = false;
  const add = (t, m) => { const [h, mm] = t.slice(0, 5).split(":").map(Number); const x = Math.max(0, Math.min(23 * 60 + 59, h * 60 + mm + m)); return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
  if (day) { day.open_time = add(day.open_time, 60); day.close_time = add(day.close_time, -120); }
  if (photo) photo.is_active = false;
  T().testimonials.push(review);
  p = await profile();
  await load();
  const after = await stamps(), text = await pageText();
  {
    const now = raised && F.money(raised.price);
    const mine = after.filter((s) => s.from === priceSt?.from);
    const card = raised ? flat(await page.locator('[data-section="book"] .bk-card', { hasText: raised.name }).first().innerText().catch(() => "")) : "";
    line("price", raised ? `${raised.name}: ${oldPrice} → ${now}. The site shows ${now} and no ${oldPrice}` : "Raise one price by $5",
      !!raised && mine.length > 0 && mine.every((s) => s.text.includes(now) && !s.text.includes(oldPrice)) && card.includes(now) && !card.includes(oldPrice),
      !raised ? "the page shows no price to change" : !card ? `${n(mine.length, "place")} on the site; booking step 1 does not offer ${raised.name}`
        : mine.every((s) => s.text.includes(now) && !s.text.includes(oldPrice)) && card.includes(now) && !card.includes(oldPrice) ? `${n(mine.length, "place")} on the site, and booking step 1`
        : `the site shows ${[...new Set(mine.map((s) => s.text))].join(" and ")}; booking step 1 says ${card.slice(0, 40)}`);
  }
  {
    // Its name may still appear inside another service's wording (Complete care includes an "Interior reset"), so
    // the test is: no stamp for it on the site, and no booking card that offers it.
    const named = hidden ? await page.evaluate((n) => [...document.querySelectorAll('[data-section="book"] .bk-card')].filter((e) => e.innerText.trim().startsWith(n)).length, hidden.name) : 0;
    line("hide", hidden ? `Hid ${hidden.name}. Gone from the site and from booking` : "Hide one service",
      !!hidden && !after.some((s) => s.from.startsWith(`service:${hidden.id}`)) && !named,
      hidden ? (named ? `booking still offers "${hidden.name}"` : "") : "no service on the page can be hidden without breaking a pinned connection");
  }
  {
    const hrs = after.find((s) => s.from === "hours.week");
    line("hours", day ? `${oldDay} → ${F.time12(day.open_time)} – ${F.time12(day.close_time)}. The site shows it` : "Change one day's hours",
      !!day && !!hrs && hrs.text.includes(dayLine(day)) && !hrs.text.includes(oldDay), hrs ? "" : "the page shows no hours");
  }
  line("photo", photo ? "Removed one photo. Gone from the site" : "Remove one photo",
    !!photo && !after.some((s) => s.from === `gallery:${photo.id}`) && !after.some((s) => photoUrls(photo).some((u) => s.imgs.includes(u))) && !(await page.locator("[data-refused]").count()),
    photo ? (await page.locator("[data-refused]").count() ? "the page refused to draw without it" : "") : "the page shows no photo from the gallery");
  line("review", "Added one review. It shows", text.includes(review.quote), text.includes(review.quote) ? "" : "the new review is not on the page");
  await verifyAll("stamps-after", "After the changes, every connected item still matches the dashboard");

  // ---- 4. the practice booking, on a fresh copy
  await fetch(`${engine.url}/__demo/reset`, { method: "POST", body: "{}" });
  p = await profile();
  slotAnswers.length = 0;
  await load();
  const walk = await walkBooking(page);
  const calls = await (await fetch(`${engine.url}/__demo/calls`)).json();
  const posts = calls.filter((c) => c.path === "/functions/v1/create-booking" && c.method === "POST" && c.status === 200);
  const post = posts[0];
  if (post) {
    const { customer_name, customer_email, customer_phone, booking_ref, shown_total, sms_consent, ...quoteBody } = post.body;
    const q = await (await fetch(`${engine.url}/functions/v1/calculate-booking`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(quoteBody) })).json();
    const num = (s) => Number(String(s).replace(/[^\d.]/g, ""));
    const stored = T().bookings.at(-1);
    line("quote", "Practice booking: the price shown equals calculate-booking",
      q.quote?.total === num(walk.shownTotal) && q.quote?.total === Number(shown_total) && q.quote?.total === stored?.total_price,
      `calculate-booking ${F.money(q.quote?.total)} · on screen ${walk.shownTotal} · stored ${F.money(stored?.total_price)}`);
    const dayAns = slotAnswers.map((a) => a.days?.[post.body.booking_date] || (a.slots && a)).find(Boolean);
    const want = slotsForType(dayAns, post.body.service_type), shown = walk.times.map(hhmm);
    line("slots", "The times offered equal available-slots",
      !!dayAns && want.length > 0 && want.length === shown.length && want.every((t) => shown.includes(t)),
      `${n(shown.length, "time")} offered on ${post.body.booking_date}; available-slots gave ${want.length}`);
  } else {
    line("quote", "Practice booking: the price shown equals calculate-booking", false, walk.error ? `${walk.error}${walk.why ? ` — the page says: ${walk.why}` : ""}` : "no booking was sent");
    line("slots", "The times offered equal available-slots", false, "no booking was sent");
  }
  line("post", "One booking post recorded (create-booking)", posts.length === 1 && T().bookings.length === 1,
    `${n(posts.length, "post")}, ${n(T().bookings.length, "booking")} in the test copy`);
  line("console", "The page showed no errors", !problems.length, problems.slice(0, 3).join(" | "));
} catch (e) {
  if (!e.quiet) line("run", "The check ran to the end", false, e.message.split("\n")[0]);
} finally {
  await browser?.close().catch(() => {});
  if (vite) { try { process.platform === "win32" ? spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" }) : vite.kill(); } catch {} }
  const closed = engine ? await engine.close().then(() => true, () => false) : false;
  line("thrown", "Test copy thrown away; nothing went to the real dashboard", closed && !outside.length,
    outside.length ? `${outside.length} request(s) left the laptop: ${outside[0]}` : "every data request went to the test copy");
}

const failed = lines.filter((l) => !l.pass);
const result = { ok: !failed.length, revision: LABEL, spec: SPEC_FILE, business: spec.slug, ran: new Date().toISOString(), ms: Date.now() - t0,
  passed: lines.length - failed.length, failed: failed.length, break: BREAK || undefined, lines };
mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(result, null, 2) + "\n");
if (JSONL) console.log(JSON.stringify({ done: { ok: result.ok, passed: result.passed, failed: result.failed, ms: result.ms } }));
else console.log(`\n${result.passed} of ${lines.length} green${failed.length ? `, ${failed.length} red` : ""} — ${path.relative(ROOT, OUT_FILE)}`);
process.exit(failed.length ? 1 : 0);
