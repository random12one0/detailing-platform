// STUDIO S2 — THE CONNECTION CHECK (STUDIO-SPEC.md §2c, layers 2 and 3).
//
//   node scripts/studio/studio-check.mjs [--spec <revision.json>] [--seed <snapshot.json>]
//        [--out <result.json>] [--jsonl] [--revision <label>] [--shot <first-screen.png>] [--break=<kind>]
//
// Proves, on a throw-away copy of the detailer's dashboard, that a revision of
// their site holds no fact of its own:
//   1. starts the offline engine (belt-staging/demo-backend.mjs) IN THIS PROCESS,
//      seeded with a snapshot of the site's business (--seed; default the
//      Brightline example) — the real database is never called;
//   2. draws the revision (--spec; default app/src/site/specs/brightline.json)
//      headless through the real renderer (/site/preview on a Vite dev server);
//   3. checks every data-from stamp on the page against the profile it came from;
//   4. CHANGES EVERY BOUND FACT in the copy to a new value no other fact has
//      (every price, name, description, length, inclusion, size price, add-on,
//      plan, the sale, the area, the phone, every question, the payment notes,
//      every day's hours, every photo, every review), reloads, and checks each
//      stamp against the new value AND that its old value is gone — per stamp, so
//      a frozen copy of any one fact, or two same-priced services swapped, goes red;
//   5. then hides a service, removes a photo and adds a review, and reloads again;
//   6. books a practice job on a fresh copy: the price shown equals the booking
//      system's quote, the times offered equal the calendar's, one booking recorded;
//   7. throws the copy away, and confirms no data request left the laptop.
// If the copy cannot be made or the revision does not fit it, the check stops at
// once: one red line, every later line "not tried".
//
// Output: one human line per tick (one JSON line each with --jsonl), and the whole
// tick list as JSON in --out (default artifacts/studio-check/result.json).
// Exit 0 when every tick is green, 1 otherwise.
//
// --break=<kind> cuts the wire on purpose, for tests/studio-check.test.mjs:
//   missing-id     the revision's menu points at a service group the dashboard lacks
//   wrong-stamp    the page claims one service's price is another's
//   frozen-price   the page keeps every price it first drew
//   freeze-others  the page keeps every price it first drew except the first one
//   same-price     two services cost the same, and the page shows one's price in the other's place
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
const { normalizeProfile, createBookingTransport, slotsForType, vehicleSizeExtra } = await import(pathToFileURL(path.join(APP, "src/book/core.js")).href);
const F = await import(pathToFileURL(path.join(APP, "src/lib/format.js")).href);

// Every tick, in order, in plain words (the Studio shows these before a run).
const PLAN = [
  ["copy", "Made a private test copy of the dashboard"],
  ["valid", "This revision fits the dashboard"],
  ["drawn", "The site draws every section"],
  ["stamps", "Everything on the site matches the dashboard"],
  ["prices", "Every price changed: the site and booking show each new price in its place, no old one"],
  ["words", "Every service name, description, length and inclusion changed: the site follows"],
  ["extras", "Add-ons, plans and the sale changed: the site follows"],
  ["contact", "Area, phone, questions and payment notes changed: the site follows"],
  ["hours", "Every day's hours changed: the site shows them"],
  ["photos", "Every photo changed: the site shows the new pictures"],
  ["reviews", "Every review changed: the site shows the new words"],
  ["hide", "A service was hidden: gone from the site and from booking"],
  ["photo", "A photo was removed: gone from the site"],
  ["review", "A review was added: it shows"],
  ["stamps-after", "After all the changes, everything still matches the dashboard"],
  ["quote", "Practice booking: the price shown is the price the booking system charges"],
  ["slots", "Practice booking: the times offered are the ones the calendar gave"],
  ["post", "Practice booking: exactly one booking was recorded"],
  ["console", "The page showed no errors"],
];
if (process.argv.includes("--plan")) { console.log(JSON.stringify(PLAN.concat([["thrown", "Test copy thrown away; nothing went to the real dashboard"]]))); process.exit(0); }
const SAYS = Object.fromEntries(PLAN);

const lines = [];
function line(id, pass, detail = "", { says = SAYS[id], skipped = false } = {}) {
  const l = { id, says, pass: !!pass, detail: typeof detail === "string" ? detail : JSON.stringify(detail), ...(skipped ? { skipped: true } : {}) };
  lines.push(l);
  console.log(JSONL ? JSON.stringify({ line: l }) : `${l.pass ? "PASS" : skipped ? "SKIP" : "FAIL"}  ${l.says}${l.detail ? ` — ${l.detail}` : ""}`);
  return l.pass;
}
// Nothing after a failed step can be judged: each later line says so at once.
function skipFrom(id, why) {
  const i = PLAN.findIndex(([k]) => k === id);
  for (const [k] of PLAN.slice(i)) if (!lines.some((l) => l.id === k)) line(k, false, `not tried: ${why}`, { skipped: true });
  throw Object.assign(new Error(why), { quiet: true });
}
const freePort = () => new Promise((r) => { const s = net.createServer().listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => r(p)); }); });
const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { try { if (await fn()) return true; } catch {} await new Promise((r) => setTimeout(r, 300)); } return false; };
const n = (k, w) => `${k} ${w}${k === 1 ? "" : "s"}`;
const flat = (s) => String(s ?? "").replace(/\s+/g, " ").trim();
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const photoUrls = (g) => [g.after_url, g.before_url, g.image_url].filter(Boolean);
const dayLine = (h) => `${DAYS[h.weekday]} ${h.open_time && h.close_time ? `${F.time12(h.open_time)} – ${F.time12(h.close_time)}` : "Closed"}`;
const payWord = (x) => (x.key === "other" ? x.handle : x.handle ? `${x.label} ${x.handle}` : x.label);
// "$95" inside "$950" or "$95.50" is not "$95": a value counts only where it ends.
// Case is ignored: the site may set a label in capitals with CSS.
const shows = (text, s) => { const v = flat(s); if (!v) return false; const re = new RegExp("(?<![\\d.,])" + v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(?![\\d.,])", "i"); return re.test(text); };
const same = (a, b) => flat(a).toLowerCase() === flat(b).toLowerCase();

// ---------------------------------------------------------------- layer 2: what one stamp must show
// For a stamp and a profile: { why } when the binding has nothing behind it, else what the element must show:
// texts (each must appear), exact (the whole text), urls (pictures, each a list of acceptable srcs), items (a count).
function wantOf(st, p) {
  const b = parseBinding(st.from);
  if (!b) return { why: `"${st.from}" is not an allowed binding` };
  let v;
  try { v = resolve(st.from, p); } catch (e) { return { why: e.message }; }
  switch (b.kind) {
    case "service": {
      if (!v) return { why: `no active service ${b.id} in the dashboard` };
      const s = v.service;
      if (b.field === "price") return { texts: [F.money(s.price)] };
      if (b.field === "name") return { exact: flat(s.name) };
      if (b.field === "duration") return { texts: [F.duration(s.duration_minutes)] };
      if (b.field === "description") return { texts: [s.description] };
      if (b.field === "features") return { texts: (s.features || []).filter(Boolean) };
      if (b.field === "sizes") return { texts: (p.settings.vehicle_sizes || []).map((z) => { const x = vehicleSizeExtra([s], z.key); return `${z.label} ${x ? `+${F.money(x)}` : "Base"}`; }) };
      return { texts: [] };
    }
    case "service_group": return v ? { texts: v.items.map((s) => s.name) } : { why: `no service group ${b.id} with active services` };
    case "gallery": return v ? { urls: [photoUrls(v)], only: true } : { why: `no photo ${b.id} in the gallery` };
    case "gallery.best": return { urls: v.map(photoUrls), only: true };
    case "reviews.top": { const w = v.filter((r) => r.quote); return { texts: w.map((r) => r.quote), items: w.length }; }
    case "hours.week": return { texts: v.map(dayLine) };
    case "contact.phone": return v ? { phone: String(v).replace(/\D/g, "") } : { why: "the dashboard has no phone" };
    case "sale": return v ? { texts: [`${v.percent}% off`, ...(v.label ? [v.label] : [])] } : { why: "shows a sale the dashboard does not have" };
    // the zone list is drawn only where the section has room for it (the visit board, not the hero line)
    case "area": return v ? { texts: [v.text, ...(st.zones ? v.zones.map((z) => z.name) : [])].filter(Boolean) } : { why: "shows an area the dashboard does not have" };
    case "add_ons": return { texts: (v || []).flatMap((a) => [a.name, `+${F.money(a.price)}`]) };
    case "plans": return { texts: (v || []).map((x) => x.name) };
    case "faq": return { texts: (v || []).map((x) => x.q) };
    case "pay": return { texts: (v || []).map(payWord) };
    default: return { texts: [] };
  }
}
const phoneOk = (st, d) => (st.href || "").replace(/\D/g, "").endsWith(d) || st.text.replace(/\D/g, "").includes(d);
// Null when the stamp shows what p says, else why not.
function stampProblem(st, p) {
  const w = wantOf(st, p);
  if (w.why) return w.why;
  if (w.exact != null && !same(st.text, w.exact)) return `shows "${st.text}", the dashboard says "${w.exact}"`;
  const miss = (w.texts || []).find((t) => !shows(st.text, t));
  if (miss) return `does not show "${flat(miss)}" (it shows "${st.text.slice(0, 60)}")`;
  if (w.phone && !phoneOk(st, w.phone)) return `does not lead to the dashboard's phone`;
  if (w.urls) {
    const unseen = w.urls.find((alts) => !alts.some((u) => st.imgs.includes(u)));
    if (unseen) return "a photo from the dashboard is not drawn";
    const allowed = w.urls.flat(), extra = st.imgs.filter((u) => !allowed.includes(u));
    if (w.only && extra.length) return `draws a picture the dashboard does not have (${extra[0].slice(0, 40)})`;
  }
  if (w.items != null && st.items !== w.items) return `draws ${st.items}, the dashboard has ${w.items}`;
  return null;
}
// Null when none of the OLD values this stamp had is still on it (values both profiles share are skipped).
function staleProblem(st, oldP, newP) {
  const o = wantOf(st, oldP), w = wantOf(st, newP);
  if (o.why || w.why) return null;
  const now = new Set([...(w.texts || []), w.exact].filter((x) => x != null).map(flat));
  const old = [...(o.texts || []), o.exact].filter((x) => x != null).map(flat).filter((x) => x && !now.has(x));
  const left = old.find((t) => (o.exact === t ? same(st.text, t) : shows(st.text, t)));
  if (left) return `still shows the old "${left}" (it shows "${st.text.slice(0, 80)}")`;
  if (o.phone && o.phone !== w.phone && phoneOk(st, o.phone)) return "still leads to the old phone";
  const nowUrls = new Set((w.urls || []).flat()), oldUrl = (o.urls || []).flat().find((u) => !nowUrls.has(u) && st.imgs.includes(u));
  return oldUrl ? "still draws an old photo" : null;
}

// ---------------------------------------------------------------- step 4: every bound fact moves
const shift = (t, m) => { const [h, mm] = t.slice(0, 5).split(":").map(Number); const x = Math.max(0, Math.min(23 * 60 + 59, h * 60 + mm + m)); return `${String(Math.floor(x / 60)).padStart(2, "0")}:${String(x % 60).padStart(2, "0")}`; };
const picture = (label) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="1600" height="1200" fill="#345"/><text x="80" y="200" font-size="120" fill="#fff">${label}</text></svg>`)}`;
function changeEverything(T, biz) {
  const mine = (t) => (T[t] || []).filter((r) => r.business_id === biz.id);
  const services = mine("services").filter((s) => s.is_active !== false);
  // New prices sit above every old price and differ from each other, so no old value can pass for a new one.
  const top = Math.max(0, ...services.map((s) => Number(s.price) || 0));
  services.forEach((s, i) => {
    const k = i + 1;
    s.price = top + k; s.name = `Renamed service ${k}`; s.description = `New description ${k}.`;
    // the hour moves too, so an old "1 hr" cannot hide inside a new "1 hr 15 min"
    s.duration_minutes = Number(s.duration_minutes || 60) + 60 * (k + 1) + 5; s.features = [`New inclusion ${k}`];
    if (s.vehicle_size_adjustments) for (const a of Object.values(s.vehicle_size_adjustments)) if (a && Number(a.price)) a.price = Number(a.price) + 100 + k;
  });
  const addOns = mine("add_ons"), topA = Math.max(0, ...addOns.map((a) => Number(a.price) || 0));
  addOns.forEach((a, i) => { a.name = `Renamed add-on ${i + 1}`; a.price = topA + i + 1; });
  mine("plans").forEach((x, i) => { x.name = `Renamed plan ${i + 1}`; });
  const st = mine("business_settings")[0];
  if (st) {
    if (st.site_discount_active) { st.site_discount_percent = Number(st.site_discount_percent) === 35 ? 40 : 35; st.site_discount_label = "New offer"; }
    if (Array.isArray(st.faqs)) st.faqs = st.faqs.map((f, i) => ({ ...f, q: `Changed question ${i + 1}?`, a: `Changed answer ${i + 1}.` }));
    if (Array.isArray(st.travel_zones)) st.travel_zones = st.travel_zones.map((z, i) => ({ ...z, name: `New zone ${i + 1}` }));
    for (const k of ["pay_venmo", "pay_cashapp", "pay_zelle", "pay_paypal"]) if (st[k]) st[k] = `@new-${k.slice(4)}`;
    if (st.pay_other) st.pay_other = "New payment note";
  }
  const b = T.businesses.find((x) => x.id === biz.id);
  if (b.service_area) b.service_area = "New Town and Other Town";
  if (b.contact_phone) b.contact_phone = String(b.contact_phone).replace(/\d$/, (d) => String((Number(d) + 3) % 10));
  for (const h of mine("business_hours")) {
    if (h.open_time && h.close_time) { h.open_time = shift(h.open_time, 30); h.close_time = shift(h.close_time, -30); }
    else { h.open_time = "10:00"; h.close_time = "14:00"; }
  }
  mine("gallery_images").filter((g) => g.is_active !== false).forEach((g, i) => {
    for (const k of ["after_url", "before_url", "image_url"]) if (g[k]) g[k] = picture(`New ${k.split("_")[0]} ${i + 1}`);
  });
  mine("testimonials").forEach((r, i) => { r.quote = `Changed review ${i + 1}.`; r.author = `Changed Author ${i + 1}`; });
}

// ---------------------------------------------------------------- the run
const spec = JSON.parse(readFileSync(SPEC_FILE, "utf8"));
if (BREAK === "missing-id") {
  const menu = spec.pages?.[0]?.sections?.find((s) => s.type === "catalog");
  if (menu?.group) menu.group.bind = "service_group:00000000-0000-4000-8000-000000000999";
}
let seed = null, seedError = null;
try { seed = arg("seed") ? JSON.parse(readFileSync(path.resolve(arg("seed")), "utf8")) : exampleSeed(); } catch (e) { seedError = e.message; }
let sameA = null, sameB = null;
if (BREAK === "same-price" && seed) {
  const sv = seed.tables.services.filter((s) => s.is_active !== false);
  [sameA, sameB] = [sv[1], sv[2]];
  if (sameA && sameB) sameA.price = sameB.price;
}

let engine = null, browser = null, vite = null;
const problems = [], outside = [];
try {
  // ---- 1. the private copy
  const biz = seed?.tables?.businesses?.find((b) => b.slug === spec.slug);
  if (!biz) { line("copy", false, seedError ? `the snapshot could not be read: ${seedError}` : `no business with the slug ${spec.slug} in the snapshot`); skipFrom("valid", "there is no test copy"); }
  try { engine = await startDemoBackend({ port: 0, seed, platform: ROOT, quiet: true }); } catch (e) { line("copy", false, `the test copy did not start: ${e.message}`); skipFrom("valid", "there is no test copy"); }
  const T = () => engine.db.tables;
  const api = createBookingTransport({ supabaseUrl: engine.url, anonKey: "demo-anon" });
  const profile = async () => normalizeProfile(await api.profile(spec.slug));
  let p = await profile().catch(() => null);
  if (!line("copy", !!p?.business, p?.business ? `${n(p.services.length, "service")}, ${n(p.gallery.length, "photo")}, ${n(p.testimonials.length, "review")}, hours for ${n(p.hours.length, "day")}` : "the test copy did not answer"))
    skipFrom("valid", "there is no test copy");

  // ---- 2. the revision against it
  const v = validateSpec(spec, p);
  if (!line("valid", v.ok, v.ok ? `${n(bindingsOf(spec).length, "connection")}` : v.errors.map((e) => e.message).slice(0, 3).join("; ")))
    skipFrom("drawn", "the revision does not fit the dashboard");

  // ---- the renderer, headless
  const port = await freePort();
  vite = spawn(process.execPath, [path.join(APP, "node_modules/vite/bin/vite.js"), "--port", String(port), "--strictPort", "--host", "127.0.0.1"],
    { cwd: APP, env: { ...process.env, VITE_SUPABASE_URL: engine.url, VITE_SUPABASE_ANON_KEY: "demo-anon" }, windowsHide: true, stdio: "ignore" });
  const SITE = `http://127.0.0.1:${port}/site/preview`;
  if (!(await until(() => fetch(SITE).then((r) => r.ok)))) { line("drawn", false, "the site renderer (Vite) did not start"); skipFrom("stamps", "the site renderer did not start"); }
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
  if (BREAK === "frozen-price" || BREAK === "freeze-others") await context.addInitScript((all) => {
    const keep = () => document.querySelectorAll('[data-from$=".price"]').forEach((e, i) => {
      if (!all && e.dataset.from === document.querySelector('[data-from$=".price"]')?.dataset.from) return;   // the first service stays live
      const k = `frozen:${i}:${e.dataset.from}`, was = sessionStorage.getItem(k);
      if (was == null) sessionStorage.setItem(k, e.textContent); else if (e.textContent !== was) e.textContent = was;
    });
    new MutationObserver(keep).observe(document, { subtree: true, childList: true, characterData: true });
  }, BREAK === "frozen-price");
  if (BREAK === "same-price" && sameA) await context.addInitScript(([a, b]) => {
    new MutationObserver(() => {
      const src = document.querySelector(`[data-from="service:${b}.price"]`);
      if (src) document.querySelectorAll(`[data-from="service:${a}.price"]`).forEach((e) => { if (e.textContent !== src.textContent) e.textContent = src.textContent; });
    }).observe(document, { subtree: true, childList: true, characterData: true });
  }, [sameA.id, sameB.id]);
  const page = await context.newPage();
  page.on("console", (m) => { if (["error", "warning"].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("request", (r) => { const h = new URL(r.url()).hostname; if (!["127.0.0.1", "localhost", "fonts.googleapis.com", "fonts.gstatic.com", ""].includes(h)) outside.push(r.url()); });
  const slotAnswers = [];
  page.on("response", async (r) => { if (r.url().includes("/functions/v1/available-slots")) { try { slotAnswers.push(await r.json()); } catch {} } });

  const load = async () => {
    await page.goto(SITE, { waitUntil: "networkidle" });
    await page.waitForSelector('[data-booking-step="1"], .site-msg, [data-refused]', { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(250);
  };
  const stamps = () => page.evaluate(() => [...document.querySelectorAll("[data-from]")].map((e) => ({
    from: e.dataset.from, text: e.innerText.replace(/\s+/g, " ").trim(), href: e.getAttribute("href"),
    imgs: [...e.querySelectorAll("img")].map((i) => i.getAttribute("src")), items: e.querySelectorAll(":scope > li").length, zones: e.querySelectorAll(".zones li").length,
  })));
  const pageText = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, " "));
  const summary = (list) => `${n(list.length, "item")}, ${n(new Set(list.map((s) => s.from)).size, "different connection")}`;
  const verifyAll = async (id) => {
    const list = await stamps(), bad = [];
    for (const st of list) { const why = stampProblem(st, p); if (why) bad.push(`${st.from}: ${why}`); }
    return line(id, list.length > 0 && !bad.length, bad.slice(0, 3).join("; ") || summary(list));
  };

  await load();
  const drawn = await page.evaluate(() => ({ sections: [...document.querySelectorAll("[data-section]")].map((e) => e.dataset.section), refused: !!document.querySelector("[data-refused]"), h1: document.querySelectorAll("h1").length }));
  const wanted = (spec.pages?.[0]?.sections || []).map((s) => s.id);
  if (!line("drawn", !drawn.refused && wanted.length > 0 && wanted.every((s) => drawn.sections.includes(s)) && drawn.h1 === 1,
    drawn.refused ? "the page refused this revision" : !wanted.length ? "the revision has no sections" : drawn.h1 !== 1 ? `${drawn.h1} main headings, needs exactly one`
      : wanted.every((s) => drawn.sections.includes(s)) ? `${n(wanted.length, "section")}: ${drawn.sections.join(", ")}` : `missing ${wanted.filter((s) => !drawn.sections.includes(s)).join(", ")}`,
    { says: `The site draws all ${n(wanted.length, "section")}` })) {
    line("console", !problems.length, problems.slice(0, 3).join(" | "));
    skipFrom("stamps", "the site did not draw");
  }
  if (SHOT) { await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(900); await page.screenshot({ path: SHOT }).catch(() => {}); }
  await verifyAll("stamps");

  // ---- 3. every bound fact moves; one reload; each stamp is judged against its new value and its old one
  const oldP = p;
  changeEverything(T(), biz);
  p = await profile();
  await load();
  const after = await stamps();
  const KINDS = { prices: ["service.price"], words: ["service.name", "service.description", "service.duration", "service.features", "service.sizes", "service_group"],
    extras: ["add_ons", "plans", "sale"], contact: ["area", "contact.phone", "faq", "pay"], hours: ["hours.week"], photos: ["gallery", "gallery.best"], reviews: ["reviews.top"] };
  const kindOf = (from) => { const b = parseBinding(from); return b ? (b.kind === "service" ? `service.${b.field}` : b.kind) : null; };
  const cards = await page.evaluate(() => [...document.querySelectorAll('[data-section="book"] .bk-card')].map((e) => e.innerText.replace(/\s+/g, " ").trim()));
  for (const [id, kinds] of Object.entries(KINDS)) {
    const mine = after.filter((s) => kinds.includes(kindOf(s.from)));
    const bad = [];
    for (const st of mine) { const why = stampProblem(st, p) || staleProblem(st, oldP, p); if (why) bad.push(`${st.from}: ${why}`); }
    if (id === "prices") {
      // the booking flow's own first step must offer every service at its new price, and none at an old one
      for (const s of p.services) {
        const card = cards.find((c) => c.startsWith(s.name));
        if (!card) bad.push(`booking step 1 does not offer ${s.name}`);
        else if (!shows(card, F.money(s.price))) bad.push(`booking step 1 shows ${s.name} without ${F.money(s.price)}`);
      }
      for (const o of oldP.services) if (cards.some((c) => shows(c, F.money(o.price)) && !p.services.some((s) => F.money(s.price) === F.money(o.price)))) bad.push(`booking step 1 still shows the old ${F.money(o.price)}`);
    }
    const none = !mine.length;
    line(id, (id === "prices" ? !none : true) && !bad.length,
      bad.slice(0, 3).join("; ") || (none ? (id === "prices" ? "the site shows no price" : "nothing of this kind on this site") : `${n(mine.length, "place")} checked${id === "prices" ? ", and booking step 1" : ""}`));
  }

  // ---- 4. a service hidden, a photo removed, a review added; one more reload
  const pinned = bindingsOf(spec).map((b) => b.bind);
  const hidden = T().services.find((s) => s.business_id === biz.id && s.is_active !== false && !pinned.some((b) => b.startsWith(`service:${s.id}`)) && after.some((st) => st.from.startsWith(`service:${s.id}.`)));
  const shownImgs = after.flatMap((s) => s.imgs);
  const photo = T().gallery_images.find((g) => g.business_id === biz.id && g.is_active !== false && photoUrls(g).some((u) => shownImgs.includes(u)));
  const review = { id: "00000000-0000-4000-8000-0000000007c1", business_id: biz.id, author: "Check T.", rating: 5, source: "Connection check",
    quote: "A review the connection check added to the test copy.", sort_order: Math.min(0, ...T().testimonials.map((r) => r.sort_order ?? 0)) - 1, is_active: true };
  if (hidden) hidden.is_active = false;
  if (photo) photo.is_active = false;
  T().testimonials.push(review);
  p = await profile();
  await load();
  const last = await stamps(), text = await pageText();
  {
    const named = hidden ? await page.evaluate((nm) => [...document.querySelectorAll('[data-section="book"] .bk-card')].filter((e) => e.innerText.trim().startsWith(nm)).length, hidden.name) : 0;
    line("hide", !!hidden && !last.some((s) => s.from.startsWith(`service:${hidden.id}`)) && !named,
      hidden ? (named ? `booking still offers "${hidden.name}"` : last.some((s) => s.from.startsWith(`service:${hidden.id}`)) ? "the site still shows it" : `${hidden.name} is gone`) : "no service on the page can be hidden without breaking a pinned connection");
  }
  const refused = await page.locator("[data-refused]").count();
  line("photo", !!photo && !last.some((s) => s.from === `gallery:${photo.id}`) && !last.some((s) => photoUrls(photo).some((u) => s.imgs.includes(u))) && !refused,
    photo ? (refused ? "the page refused to draw without it" : "") : "the page shows no photo from the gallery");
  line("review", text.includes(review.quote), text.includes(review.quote) ? "" : "the new review is not on the page");
  await verifyAll("stamps-after");

  // ---- 5. the practice booking, on a fresh copy
  await fetch(`${engine.url}/__demo/reset`, { method: "POST", body: "{}" });
  if (BREAK === "same-price" && sameA) { const a = engine.db.tables.services.find((s) => s.id === sameA.id); if (a) a.price = sameA.price; }
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
    line("quote", q.quote?.total === num(walk.shownTotal) && q.quote?.total === Number(shown_total) && q.quote?.total === stored?.total_price,
      `booking system ${F.money(q.quote?.total)} · on screen ${walk.shownTotal} · recorded ${F.money(stored?.total_price)}`);
    const dayAns = slotAnswers.map((a) => a.days?.[post.body.booking_date] || (a.slots && a)).find(Boolean);
    const want = slotsForType(dayAns, post.body.service_type), shown = walk.times.map(hhmm);
    line("slots", !!dayAns && want.length > 0 && want.length === shown.length && want.every((t) => shown.includes(t)),
      `${n(shown.length, "time")} offered on ${post.body.booking_date}; the calendar gave ${want.length}`);
  } else {
    line("quote", false, walk.error ? `${walk.error}${walk.why ? ` — the page says: ${walk.why}` : ""}` : "no booking was sent");
    line("slots", false, "no booking was sent");
  }
  line("post", posts.length === 1 && T().bookings.length === 1, `${n(posts.length, "booking")} sent, ${n(T().bookings.length, "booking")} in the test copy`);
  line("console", !problems.length, problems.slice(0, 3).join(" | "));
} catch (e) {
  if (!e.quiet) line("run", false, e.message.split("\n")[0], { says: "The check ran to the end" });
} finally {
  await browser?.close().catch(() => {});
  if (vite) { try { process.platform === "win32" ? spawn("taskkill", ["/T", "/F", "/PID", String(vite.pid)], { windowsHide: true, stdio: "ignore" }) : vite.kill(); } catch {} }
  const closed = engine ? await engine.close().then(() => true, () => false) : true;
  line("thrown", closed && !outside.length, outside.length ? `${n(outside.length, "request")} left the laptop: ${outside[0]}` : engine ? "every data request went to the test copy" : "no test copy was made",
    { says: "Test copy thrown away; nothing went to the real dashboard" });
}

const failed = lines.filter((l) => !l.pass);
const result = { ok: !failed.length, revision: LABEL, spec: SPEC_FILE, business: spec.slug, ran: new Date().toISOString(), ms: Date.now() - t0,
  passed: lines.length - failed.length, failed: failed.filter((l) => !l.skipped).length, skipped: lines.filter((l) => l.skipped).length, break: BREAK || undefined, lines };
mkdirSync(path.dirname(OUT_FILE), { recursive: true });
writeFileSync(OUT_FILE, JSON.stringify(result, null, 2) + "\n");
if (JSONL) console.log(JSON.stringify({ done: { ok: result.ok, passed: result.passed, failed: result.failed, ms: result.ms } }));
else console.log(`\n${result.passed} of ${lines.length} green${result.failed ? `, ${result.failed} red` : ""}${result.skipped ? `, ${result.skipped} not tried` : ""} — ${path.relative(ROOT, OUT_FILE)}`);
process.exit(failed.length ? 1 : 0);
