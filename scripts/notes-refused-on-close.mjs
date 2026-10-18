// ROADMAP 97.84 (built as 97.79's instrument) — A NOTES SAVE IS ANSWERED ON THE CLIENT IT WAS TYPED FOR.
//
//   set -a; . <main checkout>/.env; set +a
//   BASE=http://127.0.0.1:5180 node scripts/notes-refused-on-close.mjs
//   BREAK=close …    # sabotage: today's close is put back — RecordHost is given no beforeClose, a client row opens
//                    # without waiting, and an answer for a client no longer open is printed anyway (the three
//                    # pieces of the fix, rewritten out of the SERVED Clients module; nothing on disk changes)
//   BREAK=accept …   # sabotage: every save is answered as one that worked, so the refusal cases must go red
//   BREAK=reject …   # sabotage: the save REJECTS without printing when the refusal is not the network's (a view-as
//                    # tab's guard) — what 97.84's first fix did: it read its own promise before it existed (review,
//                    # 2026-10-17). The view-as case must go red.
//   BREAK=text …     # sabotage: every save sends what the server already holds instead of what was typed — ONLY the
//                    # "sent exactly the typed text" lines may go red (review finding 4: that assertion had never been
//                    # broken on its own)
//   BREAK=stale …    # sabotage: a close waits only on the save already in flight, never sending the typing that came
//                    # after it left (review, 2026-10-18) — ONLY escape-after may go red
//   BREAK=reset …    # sabotage: "Close anyway" and opening a client no longer forget the save still waiting, so
//                    # the next client's Close waits on the dropped one (review, 2026-10-18) — ONLY hang-next may go red
//   BREAK=tab …      # sabotage: the open record no longer holds the tab bar (ROADMAP 97.88: Clients never hands
//                    # settleNotes to App's holdLeave), so a tap on another tab unmounts the screen mid-save — ONLY
//                    # tab and gear may go red (at 1440; at 390 and 768 the sheet covers both)
//                    # All seven write the same .sabotage.json and the same `<case>-<w>x<h>.break-<name>.png` shots;
//                    # each run's own shots carry its name, so a clean run never overwrites them.
//
// The Notes box saves on blur, and pressing Close is itself a blur: the save used to leave as the record left, so
// a refusal was shown nowhere (Close), never sent at all (Escape, no blur), or printed under the NEXT client's box.
// 97.79 MEASURED that; since 97.84 this is a GATE: a close waits for the save, and a refusal keeps the record open —
// EVERY time, the second Close too (review finding 3). The way out is "Close anyway", the person's own choice.
//
// Every save to set_customer_notes is answered HERE, never by the database: after ANSWER_MS (a believable network
// speed, longer than the record's 180ms exit), a 403 for the refusal cases and a 204 for the ones that should work,
// or never at all for `hang`. Nothing is written anywhere. Signs in as the demo STAFF login. Per width, the record
// of the FIRST client:
//   control    type, blur by tapping the Notes label — record open, line shown (else the instrument is blind)
//   close      type, press Close
//   escape     type, press Escape (the box keeps focus, so no blur precedes the close)
//   next       type, press Close, then tap the NEXT client before the answer (as `switch` taps it)
//   switch     type, tap the next client with no Close (its row at a desk; the dimmed list behind a sheet)
//     → each: exactly one save sent; the record still open ON THE CLIENT WHO WAS TYPED FOR, holding the typed
//       text, with the "not saved" line ON SCREEN and in the page exactly once (so on no other client's record)
//   close-ok   type, press Close, the server accepts → one save sent, the record closed, no line anywhere
//   escape-ok  type, press Escape, the server accepts → the same
//   close-twice  type, Close (refused: held), Close AGAIN → a second save of the same text, and the record is STILL
//              held with the text and the line; then "Close anyway" → it goes, no further save, no line left
//   seen-close type, blur (refused: the line is on screen), THEN Close → the same: a second save, still held, then
//              "Close anyway" puts it away
//   view-as    a "view as" tab on Looking (made as platform-admin's door makes one): type, Close → NO save leaves the
//              browser, held with the text and the "Looking only" line; Close again → still held; "Close anyway" → gone
//   hang       the save is NEVER answered (review finding 2): type, Close → after the product's 5s wait the record is
//              held with the text and the "not saved yet" line on screen; "Close anyway" → gone
//   escape-after  type, tap away (that save leaves and is held back SLOW_MS), tap back in, type more, press Escape →
//              TWO saves, the second carrying the full text, and only then the record closes (review, 2026-10-18)
//   hang-next  as hang, then Close anyway, then tap the next client WITHOUT a reload and press Close with nothing
//              typed → that record closes at once (checked 1200ms later, well inside the 5s wait), no further
//              save, no line anywhere — the dropped save is never waited on by another client (review, 2026-10-18)
//   tab        (ROADMAP 97.88) type, then a real tap where the Today tab is drawn: leaving the SCREEN is a close too.
//              → one save, the tab bar still on Clients, the record held with the text and the line, as `close`
//   tab-ok     the same, the server accepts → one save, Today is the screen, no record, no line anywhere
//   gear       the same with the header's gear (it also replaces the screen) → held, the gear not opened
//   gear-ok    accepted → the gear's screen is up, no record, no line
//              WHERE THE RECORD IS A SHEET (390, 768) the sheet and its dimmed backdrop cover the tab bar and the
//              header, so the tap cannot reach either (measured before the fix, 2026-10-18: at 390 it landed inside the
//              record, at 768 on the backdrop, which is a Close). There the line asserts exactly that — the tap reached
//              no tab and no gear, and the screen is still Clients; 97.84's cases cover how that record closes.
//              All four record where the tap landed, which tab is lit, the gear, and whether the typed text is anywhere.
//   "Close anyway" must be ON SCREEN (the same test as the line) before it is pressed, in every case that uses it
// EVERY save is checked for WHAT it sent, in its own line per case: each request's p_notes must be exactly the typed
// text. Whether the text is then STORED is the function's half, proven against the real migration by
// scripts/customer-notes-route.mjs (MEMBER: "the function stored the text"); nothing is stored here.
// THE PAGE CLOCK IS FROZEN (R1/R4: "check with a frozen clock"): context.clock.setFixedTime(<the run's start>), so
// every Date the page reads is the same instant in every case; timers keep running, which the 180ms exit and the 5s
// wait need. The server's ANSWER_MS delay is the check's own, in Node, not the page's clock.
// "SHOWN" MEANS ON SCREEN, NOT PRESENT (review finding 1: it used to count hidden text, the very defect 97.79
// measured): an .error-box holding the sentence that lies wholly inside the viewport and every box that clips it,
// with no hidden or faded ancestor, and is the topmost thing at its top, middle and bottom — customer-notes-route's
// test. The check makes no scroll of its own. "ONCE" is still counted anywhere in the document, hidden or not.
// CANARY, EVERY RUN: three lines planted in the open record — hidden, faded to opacity 0, and above the viewport —
// must each be FOUND by the anywhere-count and each read as NOT shown, or the check is counting rather than looking.
// Every BREAK but accept SIGNS the rewritten module (window.__break9784) and checks the signature in every case, so a
// rewrite that never matched or never ran (docs/gotchas.md 102, 113) is a red line, not a quiet clean run.
//
// No-.env servers: the two VITE_ values are supplied to the page from the root `.env`'s SUPABASE_URL /
// SUPABASE_ANON_KEY (the anon key ships in every browser bundle). Never printed.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { demoStaff } from "./lib/demoOwner.mjs";

const require = createRequire(new URL("../app/package.json", import.meta.url));
const { chromium } = require("playwright");
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = process.env.BREAK || "";
if (BREAK && !["close", "accept", "reject", "text", "stale", "reset", "tab"].includes(BREAK)) { console.error(`unknown BREAK=${BREAK}`); process.exit(2); }
const WIDTHS = [[390, 844], [768, 1024], [1440, 900]];
const CASES = [
  { id: "control", leave: "blur", answer: "refuse" },
  { id: "close", leave: "close", answer: "refuse" },
  { id: "escape", leave: "escape", answer: "refuse" },
  { id: "next", leave: "close+row", answer: "refuse" },
  { id: "switch", leave: "row", answer: "refuse" },
  { id: "close-ok", leave: "close", answer: "accept" },
  { id: "escape-ok", leave: "escape", answer: "accept" },
  { id: "close-twice", leave: "close", answer: "refuse", twice: true },
  { id: "seen-close", leave: "blur", answer: "refuse", twice: true },
  { id: "view-as", leave: "close", answer: "accept", look: true, twice: true },
  { id: "hang", leave: "close", answer: "hang", anyway: true },
  { id: "hang-next", leave: "close", answer: "hang", anyway: true, next: true },
  { id: "escape-after", leave: "escape", answer: "accept", after: true },
  { id: "tab", leave: "tab", to: "today", answer: "refuse" },
  { id: "tab-ok", leave: "tab", to: "today", answer: "accept" },
  { id: "gear", leave: "tab", to: "gear", answer: "refuse" },
  { id: "gear-ok", leave: "tab", to: "gear", answer: "accept" },
];
const ANSWER_MS = 600;
const PRODUCT_WAIT_MS = 5000;   // Clients.jsx NOTES_WAIT_MS
const NOT_SAVED = "Your notes were not saved";
const NOT_YET = "Your notes have not saved yet";
const LOOKING = "Looking only";
const ANYWAY = "Close anyway";
const SHOTS = process.env.SHOTS || "artifacts/notes-refused-on-close";
const started_at = new Date().toISOString();
const FROZEN = new Date(started_at);
const SIGNED = ["close", "reject", "text", "stale", "reset", "tab"].includes(BREAK);
const SLOW_MS = 1500;   // escape-after: how long the FIRST save is held back
const NEXT_MS = 1200;   // hang-next: how long after Close the next record must already be gone (exit is 180ms)

// Each piece must match the served module exactly once.
const REWRITES = {
  // today's close, put back
  close: [
    [" beforeClose: settleNotes,", ""],
    ["if (!open || await settleNotes()) openCustomer(c);", "openCustomer(c);"],
    ["if (openId.current !== id) return !refusal;", ""],
  ],
  // the first fix's failure in a view-as tab: the save rejects before it prints anything
  reject: [
    ["const p = sendNotes(id, sent).then((refusal) => {",
      "const p = sendNotes(id, sent).then((refusal) => { if (refusal && !refusal.startsWith(\"Your notes\")) throw new ReferenceError(\"p\");"],
  ],
  // a save that sends the server's copy instead of the box's
  text: [["const id = open.id, sent = notes;", "const id = open.id, sent = savedNotes.current;"]],
  // a close that waits on the save in flight and never sends the typing after it
  stale: [["if (ok === true && notes !== savedNotes.current) ok = await answer(saveNotes());", ""]],
  // the dropped save left as "the save in flight" (matched against the SERVED module, which esbuild reformats)
  reset: [
    ["const openCustomer = async (c) => {\n    saving.current = null;\n", "const openCustomer = async (c) => {\n"],
    ["const dropNotes = () => {\n    saving.current = null;\n", "const dropNotes = () => {\n"],
  ],
  // the record no longer holds the tab bar (ROADMAP 97.88)
  tab: [["if (holdLeave) holdLeave.current = open ? settleNotes : null;", ""]],
};

const failures = [];
const results = [];
let assertions = 0, completed = 0, canaryCaught = null, calls = 0, rewriteMisses = 0;
const fetchFailures = [];
const check = (name, ok, detail = "") => {
  assertions++;
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${name}${ok ? "" : " " + detail}`);
  if (!ok) failures.push(`${name} ${detail}`.trim());
  return ok;
};
// Present anywhere in the document, hidden or not — the "exactly once" half.
const anywhere = (page, text) => page.evaluate((s) => [...document.querySelectorAll("body *")]
  .filter((e) => e.children.length === 0 && e.textContent.includes(s)).length, text);
// ON SCREEN as the page sits — customer-notes-route.mjs's test, applied to every .error-box holding the sentence.
// Returns how many are shown and, for each that is not, why.
const onScreen = (page, text, sel = ".error-box") => page.evaluate(([s, sel]) => {
  const why = [...document.querySelectorAll(sel)].filter((n) => n.textContent.includes(s)).map((n) => {
    const r = n.getBoundingClientRect();
    const box = (b) => `${Math.round(b.top)}-${Math.round(b.bottom)}`;
    const inside = (b) => r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5 && r.left >= b.left - 0.5 && r.right <= b.right + 0.5;
    if (!r.width || !r.height) return "no size";
    if (!inside({ top: 0, left: 0, bottom: innerHeight, right: innerWidth })) return `outside the viewport (line ${box(r)}, viewport 0-${innerHeight})`;
    let contained = true;
    for (let e = n; e; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const name = e.tagName.toLowerCase() + (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\s+/).join(".") : "");
      if (cs.visibility === "hidden" || cs.display === "none") return `hidden by ${name}`;
      if (Number(cs.opacity) < 0.9) return `faded by ${name} (opacity ${cs.opacity})`;
      if (contained && e !== n && e !== document.body && e !== document.documentElement
        && (cs.overflowX !== "visible" || cs.overflowY !== "visible") && !inside(e.getBoundingClientRect())) return `clipped by ${name} (line ${box(r)}, box ${box(e.getBoundingClientRect())})`;
      if (cs.position === "fixed") contained = false;
    }
    const x = r.left + r.width / 2;
    for (const y of [r.top + 2, r.top + r.height / 2, r.bottom - 2]) {
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(hit === n || n.contains(hit))) return `covered at y=${Math.round(y)} by ${hit ? hit.tagName.toLowerCase() + "." + String(hit.className) : "nothing"}`;
    }
    return "";
  });
  return { shown: why.filter((w) => w === "").length, why: why.filter(Boolean) };
}, [text, sel]);

const browser = await chromium.launch();
mkdirSync(SHOTS, { recursive: true });
const STAFF = demoStaff();
const tag = BREAK ? `.break-${BREAK}` : "";
for (const [w, h] of WIDTHS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  await ctx.clock.setFixedTime(FROZEN);
  const errors = [], consoleLines = [];
  // The console, read at every width, on both tabs. A refused save's 403 is this check's own answer, and the
  // platform-admin whoami 404 is designed (docs/gotchas.md 120); any other error or warning fails the width.
  const watch = (p) => {
    p.on("pageerror", (e) => errors.push(e.message.slice(0, 160)));
    p.on("console", (m) => {
      if (!["error", "warning"].includes(m.type())) return;
      const url = m.location()?.url || "";
      if (/set_customer_notes/.test(url) || /platform-admin/.test(url)) return;
      consoleLines.push(`${m.type()}: ${m.text().slice(0, 160)} ${url}`.trim());
    });
  };
  const page = await ctx.newPage();
  watch(page);
  await ctx.route(/\/src\/.*\.(js|jsx)(\?.*)?$/, async (route) => {
    // A busy dev server resets the odd module fetch (ECONNRESET, 2026-10-18, three runs in a row). Retried, and a
    // fetch that still fails is a named red line at the end, never a crash with no receipt and never a quiet pass.
    let res = null;
    for (let i = 0; i < 4 && !res; i++) {
      res = await route.fetch().catch(() => null);
      if (!res) await new Promise((r) => setTimeout(r, 500));
    }
    if (!res) { fetchFailures.push(route.request().url().replace(BASE, "")); return route.abort().catch(() => {}); }
    let body = (await res.text())
      .replaceAll("import.meta.env.VITE_SUPABASE_URL", JSON.stringify(process.env.SUPABASE_URL))
      .replaceAll("import.meta.env.VITE_SUPABASE_ANON_KEY", JSON.stringify(process.env.SUPABASE_ANON_KEY));
    if (SIGNED && /\/src\/screens\/Clients\.jsx/.test(route.request().url())) {
      for (const [from, to] of REWRITES[BREAK]) {
        if (body.split(from).length !== 2) { rewriteMisses++; continue; }
        body = body.replace(from, to);
      }
      body = `window.__break9784 = true;\n${body}`;
    }
    await route.fulfill({ response: res, body });
  });
  let sent = 0, answer = "refuse", notesIn = [], slowFirst = false;
  await ctx.route(/\/rest\/v1\/rpc\/set_customer_notes/, async (route) => {
    sent++; calls++;
    notesIn.push(route.request().postDataJSON()?.p_notes);
    const a = answer;
    if (a === "hang") return;   // never answered; the next navigation abandons it
    await new Promise((r) => setTimeout(r, slowFirst && sent === 1 ? SLOW_MS : ANSWER_MS));
    await route.fulfill(a === "accept" ? { status: 204, body: "" }
      : { status: 403, json: { code: "42501", message: "not a member of this business" } }).catch(() => {});
  });

  await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector("input[type=email], .tabbar", { timeout: 60000 });
  if (await page.locator("input[type=email]").count()) {
    await page.fill("input[type=email]", STAFF.email);
    await page.fill("input[type=password]", STAFF.password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });
  }
  const auth = await page.evaluate(() => {
    try { localStorage.setItem("dp.tours", JSON.stringify(["shell", "today", "calendar", "money", "clients", "business"])); localStorage.setItem("dp.tour", "1"); } catch {}
    return localStorage.getItem(Object.keys(localStorage).find((k) => /^sb-.*-auth-token$/.test(k)));
  });
  // The view-as tab: a second tab of the same browser, made a "view as" tab on Looking the way the door makes one
  // (the same recipe as customer-notes-route.mjs). Opened on first use.
  let look = null;
  const lookTab = async () => {
    if (look) return look;
    look = await ctx.newPage();
    watch(look);
    await look.addInitScript((a) => {
      sessionStorage.setItem("dp.preview", "1");
      sessionStorage.setItem("dp.preview.mode", "look");
      if (!sessionStorage.getItem("dp.preview.auth")) sessionStorage.setItem("dp.preview.auth", a);
    }, auth);
    return look;
  };
  const boxOf = (p) => p.locator("label.field:has-text('Notes') textarea").first();
  const title = (p) => p.locator(".record h2, .sheet h2").first().textContent({ timeout: 2000 }).catch(() => null);
  const closeX = (p) => p.locator("button.x[aria-label='Close']").first().click();
  const openRecord = async (p) => {
    const rows = p.locator(".rows.cols.clients .row-item");
    await p.goto(`${BASE}/app/clients`, { waitUntil: "domcontentloaded" });
    await p.waitForSelector(".rows.cols.clients .row-item", { timeout: 30000 });
    const next = await rows.nth(1).boundingBox();   // where the next client's row is, before anything covers it
    await rows.nth(0).click();
    await boxOf(p).waitFor({ state: "visible", timeout: 15000 });
    await p.evaluate(() => Promise.all((document.querySelector(".record, .sheet")?.getAnimations({ subtree: true }) ?? [])
      .filter((a) => a.effect?.getComputedTiming().duration !== Infinity).map((a) => a.finished.catch(() => {}))));
    return next;
  };
  const settle = (p, ms = ANSWER_MS + 1500) => p.waitForTimeout(ms);
  // The record as the person sees it now.
  const state = async (p, line) => {
    const box = boxOf(p);
    const recordOpen = (await box.count()) > 0;
    const vis = await onScreen(p, line);
    return {
      sent, recordOpen,
      shown_as: recordOpen ? await title(p) : null,
      text: recordOpen ? await box.inputValue() : null,
      found: await anywhere(p, line), shown: vis.shown, not_shown_because: vis.why,
    };
  };

  // The frozen clock is asserted, not assumed: the page reads the run's start instant, and still does 300ms later.
  const clock = [await page.evaluate(() => Date.now())];
  await page.waitForTimeout(300);
  clock.push(await page.evaluate(() => new Date().getTime()));
  check(`${w}: the page clock is frozen at the run's start`, clock.every((t) => t === FROZEN.getTime()), JSON.stringify({ clock, frozen: FROZEN.getTime() }));

  if (canaryCaught === null) {
    await openRecord(page);
    await page.evaluate((s) => {
      const after = document.querySelector("label.field textarea").closest("label");
      for (const css of ["display:none", "opacity:0", "position:fixed;top:-300px;left:0"]) {
        const d = document.createElement("div");
        d.className = "error-box planted-canary"; d.textContent = s; d.style.cssText = css;
        after.after(d);
      }
    }, NOT_SAVED);
    const found = await anywhere(page, NOT_SAVED), vis = await onScreen(page, NOT_SAVED);
    await page.evaluate(() => document.querySelectorAll(".planted-canary").forEach((d) => d.remove()));
    canaryCaught = found === 3 && vis.shown === 0 && vis.why.length === 3;
    check("canary: three planted lines (hidden, faded, above the viewport) are all found and none reads as shown", canaryCaught, JSON.stringify({ found, vis }));
  }

  for (const c of CASES) {
    const p = c.look ? await lookTab() : page;
    const box = boxOf(p);
    const next = await openRecord(p);
    if (SIGNED) check(`${w} ${c.id}: the sabotaged module is the one running`, await p.evaluate(() => window.__break9784 === true));
    sent = 0; notesIn = []; slowFirst = !!c.after;
    answer = BREAK === "accept" && c.answer === "refuse" ? "accept" : c.answer;
    const name = await title(p);   // the client this case opened
    const typed = `97.84 ${c.id} ${w}`;
    let tapped = null, sheet = false;
    const line = c.look ? LOOKING : c.answer === "hang" ? NOT_YET : NOT_SAVED;
    const early = c.after ? typed.slice(0, -` ${w}`.length) : typed;   // escape-after: the text the first save carries
    await box.click();
    await box.fill(early);
    if (c.after) {   // tap away (the save of the early text leaves, held back), tap back, type the rest
      await p.locator("label.field:has-text('Notes') > span").first().click();
      await p.waitForTimeout(200);
      await box.click();
      await box.press("End");
      await box.pressSequentially(typed.slice(early.length));
    }
    if (c.leave === "blur") await p.locator("label.field:has-text('Notes') > span").first().click();
    else if (c.leave === "escape") await p.keyboard.press("Escape");
    else if (c.leave === "close") await closeX(p);
    else if (c.leave === "tab") {   // a real tap where the tab (or the gear) is drawn; whatever is on top there takes it
      sheet = (await p.locator(".sheet").count()) > 0;
      const r = await p.locator(c.to === "gear" ? "header button[data-tour=gear]" : `.tabbar button[data-tour=${c.to}]`).boundingBox();
      tapped = await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? (e.closest("button[data-tour]")?.dataset.tour ?? e.tagName.toLowerCase() + "." + String(e.className)) : "nothing"; }, [r.x + r.width / 2, r.y + r.height / 2]);
      await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2);
    }
    else {
      if (c.leave === "close+row") { await closeX(p); await p.waitForTimeout(250); }
      // A real tap at the next client: at a desk its row, beside the record. Where the record is a sheet the list
      // is dimmed behind it and the row is under the panel or below the fold, so the tap lands on the dimmed list.
      if (await p.locator(".sheet").count()) await p.mouse.click(w / 2, 60);
      else await p.mouse.click(next.x + next.width / 2, next.y + next.height / 2);
    }
    await settle(p, c.answer === "hang" ? PRODUCT_WAIT_MS + 1500 : c.after ? SLOW_MS + ANSWER_MS + 1500 : undefined);
    const first = await state(p, line);
    if (c.leave === "tab") Object.assign(first, {
      tapped,
      sheet,
      lit_tab: await p.locator(".tabbar button.active").first().getAttribute("data-tour", { timeout: 2000 }).catch(() => null),
      gear_open: (await p.locator("header button[data-tour=gear]").first().getAttribute("aria-pressed", { timeout: 2000 }).catch(() => null)) === "true",
      typed_anywhere: await p.evaluate((s) => [...document.querySelectorAll("textarea, input")].some((e) => e.value.includes(s)) || document.body.innerText.includes(s), typed),
    });
    await p.screenshot({ path: `${SHOTS}/${c.id}-${w}x${h}${tag}.png` });
    // Held: open on the client typed for, the text, the line on screen and in the page exactly once.
    const held = (s) => !!name && s.recordOpen && s.shown_as === name && s.text === typed && s.found === 1 && s.shown === 1;
    let second = null, anyway = null;
    if (c.twice && first.recordOpen) {   // Close again, with the line on screen
      await closeX(p);
      await settle(p);
      second = await state(p, line);
      await p.screenshot({ path: `${SHOTS}/${c.id}-again-${w}x${h}${tag}.png` });
    }
    if ((c.twice || c.anyway) && (second ?? first).recordOpen) {   // the way out: the person's own choice
      const btn = p.locator("button", { hasText: ANYWAY });
      // Offered = on screen as the page sits, by the same test as the line; Playwright's click would scroll to it.
      const vis = await onScreen(p, ANYWAY, "button");
      anyway = { offered: vis.shown, offered_not_shown_because: vis.why };
      if (anyway.offered) { await btn.first().click(); await settle(p, 600); }
      Object.assign(anyway, await state(p, line));
      await p.screenshot({ path: `${SHOTS}/${c.id}-anyway-${w}x${h}${tag}.png` });
    }
    let after = null;
    if (c.next && anyway && !anyway.recordOpen) {   // the next client, same page, nothing typed, Close
      await p.locator(".rows.cols.clients .row-item").nth(1).click();
      await box.waitFor({ state: "visible", timeout: 15000 });
      await p.waitForTimeout(400);
      const other = await title(p);
      await closeX(p);
      await p.waitForTimeout(NEXT_MS);
      after = { client: other, ...(await state(p, line)) };
      await p.screenshot({ path: `${SHOTS}/${c.id}-after-${w}x${h}${tag}.png` });
      if (after.recordOpen) {   // the defect: say where its line lands once the 5s wait runs out
        await settle(p, PRODUCT_WAIT_MS);
        after.late = await state(p, line);
        await p.screenshot({ path: `${SHOTS}/${c.id}-after-late-${w}x${h}${tag}.png` });
      }
    }
    const sentTyped = c.after ? JSON.stringify(notesIn) === JSON.stringify([early, typed]) : notesIn.every((n) => n === typed);
    results.push({ width: w, case: c.id, answer, first, second, anyway, after, notes_sent: notesIn, sent_typed: sentTyped });
    console.log(`  ${w} ${c.id}: ${JSON.stringify({ first, second, anyway, after })}`);
    const detail = JSON.stringify({ first, second, anyway, after, notes_sent: notesIn });
    const goneClean = (s) => !!s && s.offered > 0 && !s.recordOpen && s.found === 0;
    let ok;
    if (c.look) ok = check(`${w} ${c.id}: no save left the tab; ${name}'s record held the text and the Looking-only line through two Closes; Close anyway put it away`,
      held(first) && first.sent === 0 && !!second && held(second) && second.sent === 0 && goneClean(anyway) && anyway.sent === 0, detail);
    else if (c.twice) ok = check(`${w} ${c.id}: held on the refusal; a second Close sent again and STILL held the text and the line; Close anyway put it away with no further save`,
      held(first) && first.sent === 1 && !!second && held(second) && second.sent === 2 && goneClean(anyway) && anyway.sent === 2, detail);
    else if (c.next) ok = check(`${w} ${c.id}: after Close anyway on a save with no answer, the next client's record closed at once (${NEXT_MS}ms) with no further save and no line anywhere`,
      held(first) && first.sent === 1 && goneClean(anyway) && !!after && !!after.client && after.client !== name
        && !after.recordOpen && after.found === 0 && after.sent === 1, detail);
    else if (c.anyway) ok = check(`${w} ${c.id}: a save with no answer held ${name}'s record with the text and the "not saved yet" line; Close anyway put it away`,
      held(first) && first.sent === 1 && goneClean(anyway), detail);
    else if (c.leave === "tab" && first.sheet) ok = check(`${w} ${c.id}: the record is a sheet over the ${c.to === "gear" ? "header" : "tab bar"}: the tap reached no tab and no gear, one save, the screen is still Clients`,
      first.sent === 1 && first.tapped !== c.to && first.lit_tab === "clients" && !first.gear_open, detail);
    else if (c.leave === "tab" && c.answer === "refuse") ok = check(`${w} ${c.id}: a tap on ${c.to} waited for the save; refused, the screen stayed on Clients with ${name}'s record holding the text and the line`,
      held(first) && first.sent === 1 && first.tapped === c.to && first.lit_tab === "clients" && !first.gear_open, detail);
    else if (c.leave === "tab") ok = check(`${w} ${c.id}: a tap on ${c.to} waited for the save; accepted, ${c.to} is the screen, no record, no line anywhere`,
      first.sent === 1 && first.tapped === c.to && !first.recordOpen && first.found === 0
        && (c.to === "gear" ? first.gear_open : first.lit_tab === c.to && !first.gear_open), detail);
    else if (c.after) ok = check(`${w} ${c.id}: the typing after the first save left was sent before the record closed: two saves, closed, no line`,
      first.sent === 2 && !first.recordOpen && first.found === 0, detail);
    // What each case must show is c.answer's; BREAK=accept changes only what the server says.
    else if (c.answer === "refuse") ok = check(`${w} ${c.id}: one save, ${name}'s record still open with the text and the line on screen, on no other client`,
      held(first) && first.sent === 1, detail);
    else ok = check(`${w} ${c.id}: one save, the record closed, no line anywhere`,
      first.sent === 1 && !first.recordOpen && first.found === 0, detail);
    // The text half on its own line, so BREAK=text can redden it and nothing else.
    if (!c.look) ok = check(`${w} ${c.id}: ${c.after ? "the saves sent the early text, then exactly the full typed text" : "every save sent exactly the typed text"}`, notesIn.length > 0 && sentTyped, JSON.stringify(notesIn)) && ok;
    if (ok) completed++;
  }
  check(`${w}: no page errors`, errors.length === 0, JSON.stringify(errors));
  check(`${w}: no console errors or warnings`, consoleLines.length === 0, JSON.stringify(consoleLines));
  await ctx.close();
}
await browser.close();
check("every module the page asked for was served (after retries)", fetchFailures.length === 0, JSON.stringify(fetchFailures));
if (SIGNED) check("sabotage: every rewrite matched the served module", rewriteMisses === 0, `${rewriteMisses} missed`);

const textLines = CASES.filter((c) => !c.look).length;
writeReceipt({
  check_id: "notes-refused-on-close",
  started_at,
  status: failures.length ? "fail" : "pass",
  expected_targets: WIDTHS.length * CASES.length,
  discovered_targets: WIDTHS.length * CASES.length,
  attempted_targets: WIDTHS.length * CASES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: WIDTHS.length * (CASES.length + textLines + 3) + 2,
  failures,
  assertion_floor: "structural: one behaviour assertion per case plus one sent-text assertion per case that sends, a frozen-clock, page-error and console check per width, and the canary once",
  artifacts: [SHOTS],
  canary: { id: "planted-hidden-faded-offscreen-lines-found-not-shown", observed_failure: canaryCaught === true },
  dimensions: { break: BREAK || undefined, login: "demo staff", answer_ms: ANSWER_MS, product_wait_ms: PRODUCT_WAIT_MS, frozen_clock: started_at, calls, rewrite_misses: SIGNED ? rewriteMisses : undefined, cases: results },
});
process.exit(failures.length ? 1 : 0);
