// ROADMAP 9.12d — big back-office sections become a one-line preview that opens
// in place on ONE press. Live platform, real browser, phone first.
//
//   node scripts/office-folds.mjs                 (dev server on :5173, credentials in .env)
//   node scripts/office-folds.mjs --lite          (the ?lite=1 reduced-motion path)
//   node scripts/office-folds.mjs --break=fold-warning
//   node scripts/office-folds.mjs --break=hide-mail-problems
//   node scripts/office-folds.mjs --freeze=before|after|before-mail|after-mail
//
// WHAT IT ASKS, per width (390, 768, 1440), on System:
// * "Every check" arrives FOLDED, its preview names the working / never-proven /
//   broken counts and they equal the rows inside;
// * ONE press on the preview opens it, and every check row is then visible;
// * "Needs a look" (every broken or never-proven check) is visible with NO press —
//   a problem must never sit behind one — and holds every non-ok row of Every check;
// * the hero and "Needs a look" are never inside a fold;
// * "Email we sent" arrives FOLDED, no email seen; its preview's Problems count
//   is SEEN with no press and equals the problem rows in the list; one press
//   opens it and the filters, the list and its first email are then seen;
// * nothing overlaps or is cut by the screen edge, open and closed; console clean.
// It also records each System section's height and the page height, closed.
//
// THE CANARY folds "Needs a look" into a closed <details> in the page and requires
// the same inspector to name it hidden. `--break=fold-warning` does that for the
// whole run, so the real question must go red; the receipt then lands in
// receipts/office-folds.sabotage.json. A second canary moves the mail preview's
// Problems count inside the closed fold and requires the inspector to call it
// unseen; `--break=hide-mail-problems` does that for the whole run.
//
// Signs in as a THROWAWAY platform admin, created here and deleted in a finally
// (scripts/admin-account.mjs). Nothing else is written. Do not wrap in `timeout`
// (docs/gotchas.md 90).

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { mkdirSync } from "node:fs";
import { writeReceipt } from "./receipt.mjs";
import { settle, watchConsole } from "./lib/bookingWalk.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const started_at = new Date().toISOString();
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || "").split("=")[1] || "";
const BREAK = arg("break"), FREEZE = arg("freeze");
const LITE = process.argv.includes("--lite");
const BASE = process.env.BASE || "http://localhost:5173";
const ADMIN_EMAIL = "office-folds-test@detailplatform.com";
const SIZES = [{ w: 390, h: 844 }, { w: 768, h: 1024 }, { w: 1440, h: 900 }];
const ART = `artifacts/office-folds${BREAK ? "/" + BREAK : ""}`;
const SHOTS = "C:/Users/rando/Downloads/claude/belt/shots/9.12d";
const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) { console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — nothing measured, no receipt written."); process.exit(1); }
if (!URL_.includes("kguqylyzgyzfktkfnhjb")) { console.error("SUPABASE_URL is not project kguqylyzgyzfktkfnhjb — refusing to run."); process.exit(1); }

let assertions = 0;
const failures = [], consoleNoise = [], artifacts = [], observed = {};
const check = (where, name, cond, detail = "") => {
  assertions++;
  if (cond) { console.log(`    ok    ${name}`); return; }
  failures.push(`${where}: ${name} ${detail}`.trim());
  console.error(`    FAIL  ${name}  ${detail}`);
};

// ONE INSPECTOR for the real questions AND the canary. "Seen" means a real box,
// on screen horizontally, painted, and not inside a closed <details>.
const INSPECT = () => {
  const R = (el) => el.getBoundingClientRect();
  const op = (el) => { let n = 1; for (let e = el; e; e = e.parentElement) n *= Number(getComputedStyle(e).opacity); return n; };
  const folded = (el) => { for (let d = el.parentElement?.closest("details"); d; d = d.parentElement?.closest("details")) if (!d.open && !d.querySelector(":scope > summary").contains(el)) return true; return false; };
  // Scrolled out of its own bounded list (the mail log) is clipped, not seen.
  const clipped = (el) => { const sc = el.closest(".bo-mail-scroll"); if (!sc) return false; const r = R(el), b = R(sc); return r.bottom <= b.top || r.top >= b.bottom; };
  const seen = (el) => !!el && R(el).width > 0 && R(el).height > 0 && !folded(el) && !clipped(el) && op(el) >= .99 && getComputedStyle(el).visibility !== "hidden";
  const sec = (l) => document.querySelector(`.bo-system section[aria-label="${l}"]`);
  const every = sec("Every check"), loud = sec("Needs a look"), hero = document.querySelector(".bo-sys-hero");
  const rows = [...document.querySelectorAll(".bo-checks li")].map((li) => ({ key: li.dataset.check, state: li.className.trim(), seen: seen(li) }));
  const loudRows = [...document.querySelectorAll(".bo-loud li")].map((li) => ({ key: li.dataset.check, seen: seen(li) }));
  const fold = every?.querySelector("details");
  const peek = fold ? [...fold.querySelectorAll(".bo-fold-preview > span")].map((s) => ({ c: s.dataset.state, n: Number(s.querySelector("b")?.textContent), seen: seen(s) })) : [];
  // Overlap among text-bearing leaves, and anything cut by the screen edge.
  const leaves = [...document.querySelectorAll(".bo-system b, .bo-system span, .bo-system time, .bo-system em, .bo-system p, .bo-system h2, .bo-system .bo-label")]
    .filter((e) => seen(e) && e.children.length === 0 && e.textContent.trim());
  const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  const overlaps = [];
  for (let i = 0; i < leaves.length; i++) for (let j = i + 1; j < leaves.length; j++) {
    if (leaves[i].contains(leaves[j]) || leaves[j].contains(leaves[i])) continue;
    if (hit(R(leaves[i]), R(leaves[j]))) overlaps.push(`${leaves[i].textContent.trim().slice(0, 20)} x ${leaves[j].textContent.trim().slice(0, 20)}`);
  }
  const cut = leaves.filter((e) => R(e).left < -0.5 || R(e).right > innerWidth + 0.5).map((e) => e.textContent.trim().slice(0, 24));
  const H = (el) => (el ? Math.round(R(el).height) : null);
  const mail = sec("Email we sent"), mfold = mail?.querySelector("details");
  const mailRows = [...document.querySelectorAll(".bo-mail [data-mail-id]")].map((li) => ({ bad: !!li.querySelector(".bo-mail-status.bad"), seen: seen(li) }));
  const mailPeek = Object.fromEntries([...(mail?.querySelectorAll("[data-peek]") ?? [])].map((s) => [s.dataset.peek, { t: s.querySelector("b")?.textContent.trim(), seen: seen(s) }]));
  return {
    folded: !!fold && !fold.open, open: !!fold?.open, rows, loudRows, peek,
    loudSeen: seen(loud), loudInFold: !!loud && folded(loud) , heroSeen: seen(hero), heroInFold: !!hero?.closest("details"),
    overlaps, cut, overflowX: document.documentElement.scrollWidth > innerWidth + 1,
    heights: Object.fromEntries([...document.querySelectorAll(".bo-system > section")].map((s) => [s.getAttribute("aria-label"), H(s)])),
    page: document.documentElement.scrollHeight,
    summaryH: fold ? H(fold.querySelector("summary")) : null,
    mailFolded: !!mfold && !mfold.open, mailOpen: !!mfold?.open, mailRows, mailPeek,
    mailSummaryH: mfold ? H(mfold.querySelector("summary")) : null,
    mailListSeen: seen(mail?.querySelector(".bo-mail-scroll")), mailFiltersSeen: [...(mail?.querySelectorAll(".bo-mail-filters button") ?? [])].filter(seen).length,
  };
};
const inspect = (page) => page.evaluate(`(${INSPECT.toString()})()`);
// The sabotage AND the canary: wrap "Needs a look" in a closed fold.
const FOLD_WARNING = () => {
  const s = document.querySelector('.bo-system section[aria-label="Needs a look"]');
  if (!s || s.closest("details[data-sab]")) return false;
  const d = document.createElement("details"); d.dataset.sab = "1";
  const sum = document.createElement("summary"); sum.textContent = "Warnings";
  s.replaceWith(d); d.append(sum, s); return true;
};
// The second sabotage AND canary: the mail problem count moved behind the press.
const HIDE_MAIL_PROBLEMS = () => {
  const s = document.querySelector(".bo-mail [data-peek=bad]"), body = document.querySelector(".bo-mail details > summary + *");
  if (!s || !body || body.contains(s)) return false;
  s.dataset.from = "preview"; body.prepend(s); return true;
};
const UNHIDE_MAIL_PROBLEMS = () => { const s = document.querySelector('[data-from="preview"]'); document.querySelector(".bo-mail .bo-fold-preview")?.append(s); };
const UNFOLD_WARNING = () => { const d = document.querySelector("details[data-sab]"); if (!d) return; d.replaceWith(d.querySelector("section")); };

mkdirSync(ART, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const H0 = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const all = await (await fetch(`${URL_}/auth/v1/admin/users?per_page=1000`, { headers: H0 })).json().catch(() => ({}));
const left = (all.users ?? []).find((u) => u.email === ADMIN_EMAIL);
if (left) { await dropAdmin(URL_, KEY, left.id); console.log("deleted a leftover throwaway admin first"); }
console.log(`writing: one throwaway platform admin on ${new URL(URL_).host}, removed when this run ends`);
const acct = await makeAdmin(URL_, KEY, ADMIN_EMAIL);
if (!acct) { console.error("could not create the throwaway admin; nothing measured"); process.exit(1); }
const redact = (t) => String(t).split(acct.password).join("[password]");

let browser = null, signedIn = null, completed = 0;
const canary = { id: "warning-section-and-mail-problems-folded-away", observed_failure: false };
try {
  browser = await chromium.launch();
  for (const size of SIZES) {
    const where = `${size.w}${LITE ? " lite" : ""}`;
    console.log(`\n${where}`);
    const ctx = await browser.newContext({ viewport: { width: size.w, height: size.h }, storageState: signedIn || undefined });
    const page = await ctx.newPage();
    watchConsole(page, where, consoleNoise);
    if (!signedIn) {
      await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
      await page.waitForSelector("input[type=email]", { timeout: 40000 });
      await page.fill("input[type=email]", acct.email);
      await page.fill("input[type=password]", acct.password);
      await page.click("form button.pa-btn");
      await page.waitForSelector(".pa-top", { timeout: 40000 });
      signedIn = await ctx.storageState();
    }
    await page.goto(`${BASE}/admin/office${LITE ? "?lite=1" : ""}#system`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".bo-system .bo-checks li", { timeout: 60000, state: "attached" });
    await page.waitForFunction(() => !/Reading/.test(document.querySelector(".bo-system").innerText), null, { timeout: 40000 });
    await settle(page, 2600);
    await page.waitForFunction(() => document.querySelector(".bo-mail")?.getAttribute("aria-busy") === "false", null, { timeout: 40000 });
    if (BREAK === "fold-warning") await page.evaluate(`(${FOLD_WARNING.toString()})()`);
    if (BREAK === "hide-mail-problems") await page.evaluate(`(${HIDE_MAIL_PROBLEMS.toString()})()`);

    if (FREEZE && size.w === 390) {
      const { freeze } = await import("file:///C:/Users/rando/Downloads/claude/belt/freeze.mjs");
      const before = FREEZE.startsWith("before"), mail = FREEZE.endsWith("-mail");
      await freeze(page, {
        out: `${SHOTS}/${FREEZE}.html`, label: before ? "Before" : "After",
        note: mail ? (before ? "On a phone the email list is about 630px tall, most of a screen, with its own scrolling box of up to 100 emails."
            : "The email list is now one line: when the last email went out and how many of the last 100 had a problem. One press opens the full list. The problem count is always on the line, so a failed email is never behind a press.")
          : before ? "On a phone the full list of every check is about 660px tall, most of a screen, and it repeats the two problems already shown in 'Needs a look' above it."
          : "The full list is now one line with the counts (working, never proven). One press opens it with every check inside. 'Needs a look' stays open above it, so a problem is never behind a press.",
        highlight: mail ? 'section[aria-label="Email we sent"]' : 'section[aria-label="Every check"]',
      });
      console.log(`froze ${SHOTS}/${FREEZE}.html`);
    }

    const a = await inspect(page);
    observed[`${where} closed`] = { heights: a.heights, page: a.page, summaryH: a.summaryH, peek: a.peek };
    console.log(`    heights ${JSON.stringify(a.heights)} page ${a.page}`);
    await page.screenshot({ path: `${ART}/closed-${size.w}${LITE ? "-lite" : ""}.png`, fullPage: true }); artifacts.push(`${ART}/closed-${size.w}.png`);
    const nonOk = a.rows.filter((r) => r.state !== "ok").map((r) => r.key).sort();
    check(where, "there are checks to fold (discovery floor: at least 9 rows)", a.rows.length >= 9, `found ${a.rows.length}`);
    check(where, "'Every check' arrives folded", a.folded);
    check(where, "while folded, no check row is seen", a.rows.every((r) => !r.seen), a.rows.filter((r) => r.seen).map((r) => r.key).join(","));
    const want = { ok: a.rows.filter((r) => r.state === "ok").length, never: a.rows.filter((r) => r.state === "never").length, bad: a.rows.filter((r) => r.state === "bad").length, warn: a.rows.filter((r) => r.state === "warn").length };
    const got = Object.fromEntries(a.peek.map((p) => [p.c, p.n]));
    const peekOk = Object.entries(want).every(([k, n]) => (n ? got[k] === n : !(k in got))) && a.peek.every((p) => p.seen);
    check(where, "the preview's counts equal the rows inside, and are seen", peekOk, `want ${JSON.stringify(want)} got ${JSON.stringify(got)}`);
    check(where, "the folded line is shorter than 200px", a.summaryH != null && a.summaryH < 200, `${a.summaryH}px`);
    check(where, "'Needs a look' is seen with NO press", nonOk.length === 0 || a.loudSeen, `seen=${a.loudSeen} inFold=${a.loudInFold}`);
    check(where, "'Needs a look' holds every broken / never-proven / near-limit check, each seen", nonOk.every((k) => a.loudRows.some((l) => l.key === k && l.seen)), `nonOk ${nonOk.join(",")}`);
    check(where, "the hero is seen and never inside a fold", a.heroSeen && !a.heroInFold);
    const badMail = a.mailRows.filter((r) => r.bad).length;
    observed[`${where} closed`].mail = { rows: a.mailRows.length, bad: badMail, peek: a.mailPeek, summaryH: a.mailSummaryH };
    check(where, "there are emails to fold (discovery floor: at least 1 row)", a.mailRows.length >= 1, `found ${a.mailRows.length}`);
    check(where, "'Email we sent' arrives folded", a.mailFolded);
    check(where, "while folded, no email and no list is seen", a.mailRows.every((r) => !r.seen) && !a.mailListSeen);
    check(where, "the mail preview's Problems count is seen with NO press and equals the problem rows; Last sent is seen", a.mailPeek.bad?.seen === true && Number(a.mailPeek.bad?.t) === badMail && a.mailPeek.last?.seen === true, `peek ${JSON.stringify(a.mailPeek)} problem rows ${badMail}`);
    check(where, "the folded mail line is shorter than 200px", a.mailSummaryH != null && a.mailSummaryH < 200, `${a.mailSummaryH}px`);
    check(where, "closed: nothing overlaps", a.overlaps.length === 0, a.overlaps.slice(0, 3).join(" | "));
    check(where, "closed: nothing cut by the screen edge, no sideways scroll", a.cut.length === 0 && !a.overflowX, a.cut.join(","));

    // ONE press opens it.
    await page.locator('section[aria-label="Every check"] summary').click();
    await page.locator('section[aria-label="Email we sent"] summary').click();
    await page.waitForTimeout(400);
    const b = await inspect(page);
    observed[`${where} open`] = { heights: b.heights, page: b.page };
    check(where, "one press opens it", b.open);
    check(where, "open: every check row is seen, each with its time", b.rows.length === a.rows.length && b.rows.every((r) => r.seen), b.rows.filter((r) => !r.seen).map((r) => r.key).join(","));
    check(where, "one press opens 'Email we sent'", b.mailOpen);
    check(where, "open: both filters, the list and its first email are seen, every email still there", b.mailFiltersSeen === 2 && b.mailListSeen && b.mailRows[0]?.seen === true && b.mailRows.length === a.mailRows.length, `filters ${b.mailFiltersSeen} list ${b.mailListSeen} rows ${b.mailRows.length}/${a.mailRows.length}`);
    check(where, "open: nothing overlaps", b.overlaps.length === 0, b.overlaps.slice(0, 3).join(" | "));
    check(where, "open: nothing cut by the screen edge, no sideways scroll", b.cut.length === 0 && !b.overflowX, b.cut.join(","));
    await page.screenshot({ path: `${ART}/open-${size.w}${LITE ? "-lite" : ""}.png`, fullPage: true }); artifacts.push(`${ART}/open-${size.w}.png`);
    if (LITE) check(where, "lite: the fold's chevron has no transition", await page.$eval('section[aria-label="Every check"] .bo-fold-more svg', (s) => getComputedStyle(s).transitionDuration.split(",").every((d) => parseFloat(d) === 0)));

    // The canary: the same inspector must see a folded-away warning.
    if (size.w === 390 && !BREAK) {
      const before = (await inspect(page)).loudSeen;
      const did = await page.evaluate(`(${FOLD_WARNING.toString()})()`);
      const after = (await inspect(page)).loudSeen;
      await page.evaluate(`(${UNFOLD_WARNING.toString()})()`);
      await page.evaluate(() => { document.querySelector(".bo-mail details").open = false; });
      await page.waitForTimeout(300);
      const m0 = (await inspect(page)).mailPeek.bad?.seen;
      const mdid = await page.evaluate(`(${HIDE_MAIL_PROBLEMS.toString()})()`);
      const m1 = (await inspect(page)).mailPeek.bad?.seen;
      await page.evaluate(`(${UNHIDE_MAIL_PROBLEMS.toString()})()`);
      canary.observed_failure = did && before === true && after === false && mdid && m0 === true && m1 === false;
      canary.detail = `loudSeen ${before} -> ${after}; mail Problems seen ${m0} -> ${m1}`;
      console.log(`    canary ${canary.observed_failure ? "CAUGHT" : "MISSED"}: ${canary.detail}`);
    }
    completed++;
    await ctx.close();
  }
} catch (e) {
  failures.push(`run stopped: ${redact(e.message)}`);
  console.error(redact(e.stack || e.message));
} finally {
  await browser?.close();
  await dropAdmin(URL_, KEY, acct.id);
  console.log("throwaway admin deleted");
}

for (const c of consoleNoise) failures.push(`console: ${redact(c)}`);
const status = failures.length === 0 && completed === SIZES.length && (BREAK || canary.observed_failure) ? "pass" : "fail";
const { path } = writeReceipt({
  check_id: `office-folds${LITE ? "-lite" : ""}`,
  started_at,
  status,
  expected_targets: SIZES.length,
  discovered_targets: SIZES.length,
  attempted_targets: SIZES.length,
  completed_targets: completed,
  skipped_targets: 0,
  assertions_executed: assertions,
  min_assertions: SIZES.length * (LITE ? 22 : 21),
  assertion_floor: `3 widths x 21 questions (22 under --lite), fixed by the code; none is conditional on the live platform except 'Needs a look', which is asked whenever any check is not ok.`,
  failures,
  artifacts,
  canary,
  warnings: [
    "Reads the LIVE platform; signs in as a throwaway platform admin created and deleted by this run. Nothing else is written.",
    "The look itself (color, glow, motion) is not judged here; the screenshots are the evidence for that.",
    ...(BREAK ? [`run with --break=${BREAK}; this receipt is a sabotage, not a result`] : []),
  ],
  dimensions: { sizes: SIZES.map((s) => `${s.w}x${s.h}`), lite: LITE, ...(BREAK && { break: BREAK }), observed },
});
console.log(`\n${status.toUpperCase()} — ${assertions} assertions, ${failures.length} failed, canary ${canary.observed_failure ? "caught" : "MISSED"} → ${path}`);
process.exit(status === "pass" ? 0 : 1);
