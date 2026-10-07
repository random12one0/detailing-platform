// WHAT THE BACK OFFICE'S OWN GROUND COSTS ITS TEXT.
//
// `tests/design-contrast.test.mjs` and `scripts/accent-sweep.mjs` both measure
// TOKEN PAIRS — a colour against the ground token it is supposed to sit on.
// Neither can see what a GRADIENT does, because the gradient is painted over
// the token and the token is what they read. That is the gap this fills, and
// `docs/BAR.md` states it as a rule: a gradient behind text is a NEW GROUND
// and every ratio has to be taken again.
//
//   node --env-file=.env scripts/admin-contrast.mjs
//   BASE=http://127.0.0.1:4173 node scripts/admin-contrast.mjs
//
// Needs a server — the dev server, or a built bundle served on `BASE` — and a
// platform-admin login (it makes and drops its own).
//
// ── THIS SCRIPT WAS BLIND AND PRINTED `clear of the floor` FOR IT ────────────
//
// Measured 2026-09-13, lane C, against the production bundle at `873d7a1`.
// All five selectors it sampled — `.pa-lead .pa-lab`, `.pa-fig .pa-lab`,
// `.pa-health .pa-quiet`, `.pa-sub` and `.pa-lab2` — contributed ZERO spots.
// `git grep` finds `pa-lead`, `pa-fig`, `pa-health`, `pa-lab2` and `pa-ground`
// nowhere in `app/src` at all. It sampled no pixels, printed no rows, kept its
// sentinel `worst = { label: "", r: 99 }` and exited 0 under the line
// `worst:  at 99.00:1`.
//
// **99:1 IS NOT A CONTRAST RATIO — 21:1 is the most two colours can reach — so
// the summary line was itself the tell, and nobody had read it.**
//
// **AND THE LIT GROUND IT WAS WRITTEN FOR IS GONE.** The original header was
// about pausing drifting lights at their brightest frame. `admin.css` paints a
// flat `background: var(--ink-0)`; there is no `.pa-ground` and no `b` inside
// one, so the `addStyleTag` that paused them matched nothing either. What is
// left worth measuring is `.pa-card`'s `linear-gradient(180deg, --ink-2,
// --ink-1)` under the two quiet roles, `.pa-lab` and `.pa-sub`.
//
// **THREE ANCHORS, because it failed by finding nothing rather than by getting
// a sum wrong.** A selector matching nothing anywhere is red; zero pixels
// sampled is red; and the subject count per screen is printed on every run,
// pass or fail.
//
// **AND IT WALKS THE SIGN-IN CARD AS WELL AS THE FIVE TABS**, because the
// first version of anchor 1 exited 1 against a healthy product: `.pa-lab`
// renders on the sign-in card and inside a detailer's record, and the five
// resting tabs carry zero of it. Right failure, wrong scope.

import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const BASE = process.env.BASE || "http://localhost:5173";
// A TEST ACCOUNT, BY ITS ADDRESS AND BY THE NOTE `makeAdmin` writes on its row.
const ADMIN_EMAIL = "admin-contrast-test@detailplatform.com";  // mail-sink: a login; autoconfirm is on and no custom SMTP, so no mail
const URL_ = process.env.SUPABASE_URL, KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }
// Made for this run, removed at the end of it — roadmap 8.2. The fixed
// password that used to be on this line was a published credential for the
// account that can read every tenant; `scripts/admin-account.mjs` has the
// finding.
// ── THE ACCOUNT'S WHOLE LIFE, ROADMAP 14.21 ─────────────────────────────────
// A throwaway PLATFORM ADMIN can read every detailer and customer and suspend,
// impersonate and reprice, and `platform_admins` has no narrower level. So its
// teardown has to run on every way a run can end, not on the happy one:
//
//   clean exit   the `finally` below
//   a throw      the same `finally`; `--crash-after-signin` throws on purpose,
//                after sign-in and before the screenshots, where the two real
//                crashes threw
//   a signal     `process.on(SIGINT|SIGTERM|SIGBREAK)` — **a `finally` does not
//                run on a signal**, only an explicit handler does
//                (`docs/gotchas.md` 90). A hard kill (`TerminateProcess`, which
//                is what Windows does to a process that ignores the polite
//                ones) cannot be caught by anything in this file; the row it
//                leaves is replaced by the next run's `makeAdmin` and the next
//                declared-admins check names it. `--drop-leftover` removes it.
//
// THE TABLE IS READ BEFORE THE ACCOUNT EXISTS AND AFTER IT IS GONE, and both
// readings are printed by the run. EMAIL ONLY: `platform_admins.note` has held
// a password in plain text and is never selected here. The password itself is
// random per run, lives in this process's memory, is never printed or written,
// and is redacted from any error text before it is shown.
const HDR = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const roster = async () => {
  const r = await fetch(`${URL_}/rest/v1/platform_admins?select=email&order=email`, { headers: HDR });
  const rows = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(rows)) throw new Error(`could not read platform_admins (${r.status})`);
  return rows.map((x) => x.email);
};

if (process.argv.includes("--drop-leftover")) {
  // Removes only the account this script makes, by its address.
  const found = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: HDR })).json();
  const left = (found.users ?? []).find((u) => u.email === ADMIN_EMAIL);
  console.log(left ? `leftover ${ADMIN_EMAIL} found; dropping it` : `no leftover ${ADMIN_EMAIL}`);
  if (left) await dropAdmin(URL_, KEY, left.id);
  console.log("platform_admins now:", JSON.stringify(await roster()));
  await new Promise((r) => setTimeout(r, 150));  // let the sockets close: process.exit with a socket closing dies on Windows (exit 3221226505)
  process.exit(0);
}

const before = await roster();
console.log("platform_admins BEFORE:", JSON.stringify(before));
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("no admin account"); process.exit(1); }
const EMAIL = acct.email, PW = acct.password;
const redact = (t) => String(t).split(PW).join("[password]");

let browser, page, tornDown = false;
async function teardown(why) {
  if (tornDown) return;
  tornDown = true;
  // THE ADMIN FIRST, THE BROWSER AFTER: dropping the account is the part that matters and takes
  // milliseconds; closing a browser mid-page can take seconds, which is a window a signal can land in.
  await dropAdmin(URL_, KEY, acct.id);          // never throws
  let after = null;
  try { after = await roster(); } catch (e) { console.error(redact(e.message)); }
  // PRINTED BEFORE THE BROWSER IS CLOSED, so the reading survives a signal that lands while it closes.
  console.log(`platform_admins AFTER (${why}):`, JSON.stringify(after));
  try { await browser?.close(); } catch { /* closing anyway */ }
  if (!after || JSON.stringify(after) !== JSON.stringify(before)) {
    console.error("THE TABLE IS NOT WHAT IT WAS BEFORE THIS RUN. Do not declare the extra row; run: node --env-file=.env scripts/admin-contrast.mjs --drop-leftover");
    process.exitCode = 1;
  }
}
for (const sig of ["SIGINT", "SIGTERM", "SIGBREAK"]) {
  process.on(sig, async () => { console.error(`${sig} received; dropping the test admin`); await teardown(sig); process.exit(sig === "SIGINT" ? 130 : 143); });
}

// The WCAG relative-luminance formula, on sRGB 0-255.
const lum = ([r, g, b]) => {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const ratio = (a, b) => {
  const [hi, lo] = lum(a) >= lum(b) ? [lum(a), lum(b)] : [lum(b), lum(a)];
  return (hi + 0.05) / (lo + 0.05);
};

// `page` is assigned inside the try below, once the browser exists; the
// functions that use it only run after that.
// **THE BROWSER DECODES ITS OWN SCREENSHOT.** Reading pixels needs a PNG
// decoder, and this repo has four dependencies; adding a fifth to check a
// colour would be the wrong trade. The page already has one — canvas — so the
// shot goes back in as a data URL and `getImageData` reads it there.
const sample = async (b64, points) => page.evaluate(async ({ b64, pts }) => {
  const img = new Image();
  await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = "data:image/png;base64," + b64; });
  const c = document.createElement("canvas");
  c.width = img.width; c.height = img.height;
  c.getContext("2d").drawImage(img, 0, 0);
  const ctx2 = c.getContext("2d");
  return pts.map((p) => {
    if (p.x < 0 || p.y < 0 || p.x >= c.width || p.y >= c.height) return null;
    const d = ctx2.getImageData(p.x, p.y, 1, 1).data;
    return [d[0], d[1], d[2]];
  });
}, { b64, pts: points });

// Where the quiet text actually is, and what is behind it. Sampling the
// BACKGROUND beside a run of text rather than the glyphs themselves: an
// antialiased glyph edge is a blend of both and would flatter the result.
const QUIET = [".pa-lab", ".pa-sub"];
const counts = Object.fromEntries(QUIET.map((q) => [q, 0]));
const rgb = (css) => css.match(/\d+/g).slice(0, 3).map(Number);
const FLOOR = 4.5;
let worst = null, measured = 0, offscreen = 0;

async function screen(name) {
  const b64 = (await page.screenshot()).toString("base64");
  const found = await page.evaluate((sels) => {
    const out = [], c = {};
    for (const sel of sels) {
      const all = [...document.querySelectorAll(sel)];
      c[sel] = all.length;
      for (const el of all) {
        // Only what is on screen: `page.screenshot()` without `fullPage` is the
        // viewport, so a spot below the fold samples out of bounds — and the
        // old code dropped an out-of-bounds sample in silence.
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.top < 0 || r.bottom > innerHeight) continue;
        const x = Math.round(r.right + 6), y = Math.round(r.top + r.height / 2);
        if (x >= innerWidth) continue;
        out.push({ sel, label: (el.textContent || "").trim().slice(0, 22), color: getComputedStyle(el).color, x, y });
      }
    }
    return { out, c };
  }, QUIET);
  for (const q of QUIET) counts[q] += found.c[q];
  const grounds = await sample(b64, found.out.map((s) => ({ x: s.x, y: s.y })));
  found.out.forEach((sp, k) => {
    const bg = grounds[k];
    if (!bg) { offscreen++; return; }
    measured++;
    const r = ratio(rgb(sp.color), bg);
    if (!worst || r < worst.r) worst = { label: `${name} · ${sp.sel} · ${sp.label}`, r };
    if (r < FLOOR) console.log(`  BELOW  ${name.padEnd(10)} ${sp.sel.padEnd(8)} ${sp.label.padEnd(24)} ${r.toFixed(2)}:1   text ${sp.color}  ground rgb(${bg.join(",")})`);
  });
  console.log(`  ${name.padEnd(10)} ${QUIET.map((q) => `${q}=${found.c[q]}`).join(" ")}  →  ${found.out.length} on screen`);
}

console.log("\nthe quietest text in the back office, against the pixels actually behind it");
console.log("(the sign-in card and every tab, at rest, 1920x1080)\n");

let crashed = null;
try {
browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
page = await ctx.newPage();
await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
await page.waitForTimeout(900);

await screen("Sign in");

await page.fill("input[type=email]", EMAIL);
await page.fill("input[type=password]", PW);
await page.click("form button.pa-btn");
await page.waitForTimeout(3000);

const TABS = await page.$$eval(".pa-tab", (els) => els.map((e) => (e.textContent || "").trim()));
if (!TABS.length) throw new Error("NO TABS — `.pa-tab` matched nothing, so the sign-in never went through.");
// Proves the teardown. Throws where the two real crashes threw: after the
// admin row exists and the sign-in is done, before anything is photographed.
if (process.argv.includes("--crash-after-signin")) throw new Error("deliberate crash, proving the teardown runs");
for (const [i, name] of TABS.entries()) {
  if (i) { await page.click(`.pa-tab >> nth=${i}`); await page.waitForTimeout(1400); }
  await screen(name);
}
} catch (e) {
  crashed = e;
} finally {
  // ONE TEARDOWN, ON EVERY PATH, AND BEFORE THE EXITS BELOW. The old ordering
  // fix (drop above the `process.exit`s) was real but did nothing for a throw:
  // two crashed runs each left a live all-seeing row, caught only by
  // tests/platform-admins-declared.test.mjs.
  await teardown("finished or threw");
}
if (crashed) {
  console.error(redact(String(crashed.message || crashed).split("\n")[0]).slice(0, 300));
  process.exit(1);
}

// **ANCHOR 1 — A SELECTOR THAT MATCHES NOTHING ANYWHERE IS THE FAILURE, NOT A
// QUIET PASS.** This is exactly how the script went blind: five selector
// families were renamed in `app/src` and nothing here noticed.
const dead = QUIET.filter((q) => !counts[q]);
if (dead.length) {
  console.log(`\nNO SUBJECTS for ${dead.join(", ")} on any screen — the back office renamed them; fix the list, do not delete the check.`);
  process.exit(1);
}
// **ANCHOR 2 — A PIXEL THAT WAS NEVER READ IS NOT A PASS.** The old code did
// `if (!bg) return;` and said nothing, so a screenshot that came back the
// wrong size would have emptied the whole run in silence.
if (offscreen) console.log(`\n${offscreen} spot(s) fell outside the screenshot and were not measured.`);
if (!measured) {
  console.log("\nZERO PIXELS SAMPLED — the screenshot and the layout disagree. That is a broken instrument, not a pass.");
  process.exit(1);
}

// **ANCHOR 3 — THE COUNT IS PRINTED WHETHER IT PASSES OR FAILS**, and there is
// no sentinel left to survive an empty run: `worst` starts null and is only
// ever set from a pixel that was actually read.
console.log(`\n${measured} measured · ${QUIET.map((q) => `${q}=${counts[q]}`).join(" ")} · worst: ${worst.label} at ${worst.r.toFixed(2)}:1 against a ${FLOOR}:1 floor`);
if (worst.r < FLOOR) {
  console.log("BELOW THE FLOOR — the ground is too bright for the text on it.");
  process.exit(1);
}
console.log("clear of the floor.");
