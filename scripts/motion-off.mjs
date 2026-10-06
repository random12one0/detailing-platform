// ROADMAP 7.9 — with motion off, nothing on the page is left hidden.
//
//   node scripts/motion-off.mjs                    # / and /pricing, five widths
//   node scripts/motion-off.mjs --shots=DIR        # also a full-page PNG per run
//   node scripts/motion-off.mjs --only=pricing --widths=320,1440
//
// Dev server on :5173. No credentials, no seed, writes nothing but the PNGs.
//
// THE DONE-WHEN, AS CODE. With `prefers-reduced-motion: reduce` AND with
// `?lite=1`, once first paint has settled — load, fonts, two frames, NO scroll
// and NO input; the network quiet, so a figure that arrives from the server
// counts as part of the first paint — no element is at opacity 0 or out of the layout; nothing
// changes after that (nothing was waiting on a timer); and the page reads in
// the same order as with motion on. OPACITY IS READ, NEVER ASSUMED FROM
// PRESENCE (ROADMAP 7.12): every element's effective opacity is the product
// of its own and every ancestor's, so a child of an opacity-0 wrapper is
// counted as the invisible thing it is.
//
// WHAT "LEFT HIDDEN" MEANS, WITHOUT A JUDGEMENT. A responsive page hides
// things on purpose — the burger at a desk, the links on a phone, a caption
// until a pointer is over it — and none of that is motion's doing. So the
// same page is also walked WITH motion on, at the same width: watched at the
// top for a full hero rotation, then scrolled through end to end. An element
// fails if motion-off hides it and motion-on EVER shows it. Anything motion-on
// never shows either is printed by count as "hidden in both", never folded
// into a pass silently.
//
// THE EXCEPTIONS ARE DECLARED, NAMED, AND COUNTED WITH AN EQUALITY
// (docs/gotchas.md 98). Each is something motion-on shows that motion-off
// deliberately does not, with the reason. A new one has to be added here, on
// purpose, with its own reason.
//
// CANARIES, EVERY RUN, aimed at the scan this script uses (gotchas 95): an
// opacity-0 paragraph planted after settle must be caught by the opacity rule,
// and a paragraph that changes two seconds later must be caught by the timer
// rule. If either goes uncaught the run fails, whatever else it found.
//
// ITS BLIND SPOT: it reads what the browser computes, so it cannot see an
// element whose content is wrong but visible, and it checks OVERLAP only for
// the hero panes (the one place motion-off stacks what motion-on rotates —
// a sabotage that piled them up passed every other rule). The motion-on walk samples
// at scroll steps of a quarter screen — a state that exists only between two
// samples is not in the reference.

import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE || "http://localhost:5173";
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").slice(k.length + 3) || d;
const WIDTHS = arg("widths", "320,392,768,1440,1920").split(",").map(Number);
const PAGES = [["home", ""], ["pricing", "pricing"]].filter(([n]) => !arg("only") || arg("only") === n);
const SHOTS = arg("shots", "");
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

// What motion-on shows and motion-off deliberately does not. Selector → why.
const EXCEPTIONS = {
  ".htabs": "the hero's tabs choose which pane shows; with motion off all three show, so there is nothing to choose",
  ".hpane + .hpane .fine": "\"Built by a detailer…\" repeats under every hero pane; with all three showing it is said once, under pane one",
  ".nojobs": "the thread demo's BEFORE frame; motion-off shows the after (four jobs booked), and \"Nothing yet\" over them would be false",
  ".divider": "the pinned demo's progress line; with motion off there is no pin and no progress to draw",
  ".dotfield": "the moving dot canvas; motion-off draws the same lattice standing still, in CSS (.dots)",
};
const EXPECTED_EXCEPTIONS = 5;

// One scan of the live page. Keys are DOM paths, so the same element can be
// found again in the motion-on page.
const SCAN = (exc) => {
  const keyOf = (el) => {
    const parts = [];
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const sig = n.tagName + (n.id ? "#" + n.id : "") + "." + [...n.classList].filter((c) => !/^(on|in|near|scr|hid|held|field|awake)$/.test(c)).sort().join(".");
      let i = 0;
      for (let s = n.previousElementSibling; s; s = s.previousElementSibling) {
        const ss = s.tagName + (s.id ? "#" + s.id : "") + "." + [...s.classList].filter((c) => !/^(on|in|near|scr|hid|held|field|awake)$/.test(c)).sort().join(".");
        if (ss === sig) i++;
      }
      parts.push(sig + ":" + i);
    }
    return parts.reverse().join(">");
  };
  const out = {};
  for (const el of document.body.querySelectorAll("*")) {
    if (el.closest("script,style,noscript,template,[hidden]")) continue;
    const cs = getComputedStyle(el);
    let op = 1, vis = cs.visibility !== "hidden", none = false;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const c = n === el ? cs : getComputedStyle(n);
      op *= +c.opacity;
      if (c.display === "none") none = true;
    }
    const shown = !none && vis && op >= 0.01;
    const hit = Object.keys(exc).find((s) => el.closest(s));
    out[keyOf(el)] = { shown, op: +op.toFixed(3), none, vis, exc: hit || null,
      text: (el.childNodes.length && [...el.childNodes].some((t) => t.nodeType === 3 && t.textContent.trim())) ? el.textContent.trim().replace(/\s+/g, " ").slice(0, 60) : "",
      name: el.tagName.toLowerCase() + (el.id ? "#" + el.id : "") + (el.classList.length ? "." + [...el.classList].join(".") : "") };
  }
  return out;
};

// THE ONE RULE, used by the scan AND by the canaries, so a canary tests this
// code rather than a copy of it. `inSeen`: motion-on showed this element.
const judge = (v, later, inSeen) => {
  if (!v.shown && !v.exc && inSeen) return "hidden";
  if (!later || later.shown !== v.shown || later.op !== v.op) return "changed";
  return null;
};

const settle = (page) => page.evaluate(() => document.fonts.ready.then(() =>
  new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))));

const browser = await chromium.launch();
let failures = 0;
const fail = (msg) => { failures++; console.log("  FAIL  " + msg); };
const excUsed = new Set();
let runs = 0, canariesCaught = 0;
const bothNames = new Map();   // printed by name at the end — a bucket nobody can read is a silence

for (const [pname, path] of PAGES) {
  for (const w of WIDTHS) {
    const vp = { width: w, height: w < 768 ? 844 : 900 };

    // ── the reference: motion ON, everything it ever shows ──────────────
    const onCtx = await browser.newContext({ viewport: vp, reducedMotion: "no-preference" });
    const on = await onCtx.newPage();
    await on.goto(`${BASE}/${path}`, { waitUntil: "networkidle" });
    await settle(on);
    // The headline on landing, motion on: whole and fully drawn (Fix line).
    const h1 = await on.evaluate(() => [...document.querySelectorAll("h1")].filter((h) => h.getClientRects().length && getComputedStyle(h.closest(".hpane") || h).opacity === "1").map((h) => {
      const spans = [...h.querySelectorAll(".mask > span")];
      return { text: h.textContent.trim(), moved: spans.some((s) => getComputedStyle(s).transform !== "none"), caret: !!h.querySelector(".caret") };
    }));
    for (const h of h1) if (h.moved || h.caret) fail(`${pname}@${w} motion-on: headline "${h.text}" is not fully drawn on landing (${h.moved ? "still in its mask" : "being typed"})`);
    const seen = {};
    const take = async () => { for (const [k, v] of Object.entries(await on.evaluate(SCAN, EXCEPTIONS))) if (v.shown) seen[k] = true; };
    await take();
    if (await on.$(".hpane")) for (let t = 0; t < 14; t++) { await on.waitForTimeout(1000); await take(); }
    const H = await on.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y <= H; y += Math.round(vp.height / 4)) {
      await on.evaluate((yy) => window.scrollTo(0, yy), y);
      await on.waitForTimeout(140);
      await take();
    }
    await on.waitForTimeout(1200); await take();
    const onOrder = Object.entries(await on.evaluate(SCAN, EXCEPTIONS)).filter(([, v]) => v.text && v.shown).map(([k]) => k);
    await onCtx.close();

    for (const mode of ["reduce", "lite"]) {
      runs++;
      const ctx = await browser.newContext({ viewport: vp, reducedMotion: mode === "reduce" ? "reduce" : "no-preference" });
      const page = await ctx.newPage();
      const errs = [];
      page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text()); });
      page.on("pageerror", (e) => errs.push(e.message));
      await page.goto(`${BASE}/${path}${mode === "lite" ? "?lite=1" : ""}`, { waitUntil: "networkidle" });
      await settle(page);
      const tag = `${pname}@${w} ${mode}`;
      if (!(await page.evaluate(() => document.documentElement.classList.contains("lite"))))
        fail(`${tag}: <html> is not .lite — the motion-off path never engaged, so nothing below measured it`);
      const a = await page.evaluate(SCAN, EXCEPTIONS);
      // canaries, planted after the first scan so they cannot pollute it
      await page.evaluate(() => {
        const m = document.querySelector("main") || document.body;
        const p = document.createElement("p"); p.id = "mo-canary-op"; p.textContent = "canary"; p.style.opacity = "0"; m.appendChild(p);
        const q = document.createElement("p"); q.id = "mo-canary-timer"; q.textContent = "before"; m.appendChild(q);
        setTimeout(() => { q.style.opacity = "0"; }, 2000);
      });
      const mid = await page.evaluate(SCAN, EXCEPTIONS);
      await page.waitForTimeout(4000);
      const b = await page.evaluate(SCAN, EXCEPTIONS);
      const opCanary = Object.entries(mid).find(([, v]) => v.name === "p#mo-canary-op");
      const tmA = Object.entries(mid).find(([, v]) => v.name === "p#mo-canary-timer");
      const tmB = Object.entries(b).find(([, v]) => v.name === "p#mo-canary-timer");
      const caughtOp = !!opCanary && judge(opCanary[1], b[opCanary[0]], true) === "hidden";
      const caughtTimer = !!tmA && judge(tmA[1], tmB && tmB[1], true) === "changed";
      if (caughtOp && caughtTimer) canariesCaught++;
      else fail(`${tag}: CANARY NOT CAUGHT (opacity ${!!caughtOp}, timer ${!!caughtTimer}) — this run measured nothing`);
      if (SHOTS) {
        await page.evaluate(() => { document.getElementById("mo-canary-op")?.remove(); document.getElementById("mo-canary-timer")?.remove(); });
        await page.screenshot({ path: `${SHOTS}/motion-off-${pname}-${w}-${mode}.png`, fullPage: true });
      }

      let hiddenBoth = 0, excepted = 0, bad = 0;
      for (const [k, v] of Object.entries(a)) {
        const later = b[k];
        const why = judge(v, later, k in seen);
        if (!v.shown && !why) { if (v.exc) { excepted++; excUsed.add(v.exc); } else { hiddenBoth++; bothNames.set(v.name, (bothNames.get(v.name) || 0) + 1); } }
        if (!why) continue;
        bad++;
        if (bad > 12) continue;
        if (why === "hidden") fail(`${tag}: ${v.name}${v.text ? ` «${v.text}»` : ""} — motion-on shows it; here ${v.none ? "display:none" : !v.vis ? "visibility:hidden" : "opacity " + v.op}`);
        else fail(`${tag}: ${v.name} changed after first paint settled (${v.shown ? "shown" : "hidden"} → ${later ? (later.shown ? "shown" : "hidden") : "gone"}) — it was waiting on a timer`);
      }
      if (bad > 12) fail(`${tag}: …and ${bad - 12} more`);
      // STACKED, NOT PILED. The motion-off hero shows all three panes, and
      // three panes at full opacity in one grid cell pass every rule above
      // while being unreadable — found by sabotage, so it is checked here:
      // no two shown panes of the same kind may share a pixel.
      const piled = await page.evaluate(() => [".hpane", ".hv"].flatMap((sel) => {
        const r = [...document.querySelectorAll(sel)].map((e) => e.getBoundingClientRect()).filter((b) => b.width && b.height);
        const hits = [];
        for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++)
          if (r[i].left < r[j].right - 1 && r[j].left < r[i].right - 1 && r[i].top < r[j].bottom - 1 && r[j].top < r[i].bottom - 1) hits.push(`${sel} ${i + 1} and ${j + 1}`);
        return hits;
      }));
      for (const p of piled) { bad++; fail(`${tag}: ${p} overlap — shown, and on top of each other`); }
      // reading order: the text-bearing elements both pages show, in DOM order
      const offOrder = Object.entries(a).filter(([, v]) => v.text && v.shown).map(([k]) => k);
      const common = new Set(onOrder.filter((k) => offOrder.includes(k)));
      const x = onOrder.filter((k) => common.has(k)), y = offOrder.filter((k) => common.has(k));
      const at = x.findIndex((k, i) => k !== y[i]);
      if (at >= 0) fail(`${tag}: reading order differs from motion-on at ${a[y[at]]?.name}`);
      for (const e of errs) fail(`${tag}: console — ${e.slice(0, 140)}`);
      console.log(`  ${bad || at >= 0 || errs.length ? "  " : "ok"}    ${tag}: ${Object.keys(a).length} elements read, ${bad} left hidden, ${excepted} excepted, ${hiddenBoth} hidden in both (not motion's doing), ${common.size} in reading order, console ${errs.length}`);
      await ctx.close();
    }
  }
}
await browser.close();

const declared = Object.keys(EXCEPTIONS).length;
if (declared !== EXPECTED_EXCEPTIONS) fail(`${declared} exceptions declared, ${EXPECTED_EXCEPTIONS} expected — a new one needs its reason and this count moved on purpose`);
const unused = Object.keys(EXCEPTIONS).filter((s) => !excUsed.has(s));
if (PAGES.length === 2 && WIDTHS.length === 5 && unused.length) fail(`exception never used on a full run, so it is excusing nothing: ${unused.join(", ")}`);
console.log("\nhidden in both modes, by name — motion-on never showed these either (responsive, hover, closed):");
for (const [n, c] of [...bothNames].sort((x, y) => y[1] - x[1])) console.log(`  ${String(c).padStart(4)}  ${n}`);
console.log(`\ncanaries caught on ${canariesCaught} of ${runs} runs`);
console.log(failures ? `FAIL — ${failures} finding(s)` : `PASS — ${runs} of ${runs} motion-off runs: nothing left hidden, nothing waiting on a timer, reading order unchanged`);
process.exit(failures ? 1 : 0);
