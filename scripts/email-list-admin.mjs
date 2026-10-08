// CAN ANDREW TELL, FROM THE BACK OFFICE'S "EMAIL WE SENT" LIST, WHICH MAIL ARRIVED,
// WHICH IS STILL ON ITS WAY AND WHICH CAME BACK — AND DOES A FAILED READ EVER
// LOOK LIKE AN EMPTY LIST.
//
//   node scripts/email-list-admin.mjs
//   node scripts/email-list-admin.mjs --headed
//   node scripts/email-list-admin.mjs --break=collapse     # sabotage: "sent" drawn as "Delivered"
//   node scripts/email-list-admin.mjs --break=placeholder  # sabotage: a chip for a null booking id
//   node scripts/email-list-admin.mjs --break=failempty    # sabotage: a failed read drawn as the empty list
//   node scripts/email-list-admin.mjs --break=filter       # sabotage: Problems asks for a list without "bounced"
//
// Needs the dev server and `.env` loaded (`set -a; . ./.env; set +a`). It makes
// its own platform-admin account and drops it, like `health-line-honest`.
//
// ROADMAP 3.1, app half. RECORDED AS A ONE-FILE EXCEPTION to the scripts/ lane
// rule, by the manager's ruling on the day it was written.
//
// ---------------------------------------------------------------------------
// WHY THE ROWS ARE FIXTURES, AND WHY THAT IS NOT THE WHOLE CHECK
// ---------------------------------------------------------------------------
// The `platform-admin` action that feeds this list does not exist in the
// deployed function yet, and `email_sends.booking_id` does not exist in the
// database until Andrew applies the migration. So the success screen can only
// be SEEN by answering `email_list` inside the browser. Nothing is written to
// `email_sends`. The same rule as `health-line-honest`: a screen fed entirely
// on its own fiction would keep passing on the day the server stopped sending
// something, so TARGET 1 is the REAL, un-rewritten answer, and it asks one
// question — **when the wire says "no", does the screen say "failed", rather
// than "no email has been sent yet"?** Today that wire is `400 Unknown action`.
//
// ---------------------------------------------------------------------------
// ROWS ARE FOUND BY THE SUBJECT THIS SCRIPT INVENTED
// ---------------------------------------------------------------------------
// The markup carries `data-mail-state` and `data-mail-id`, and reading them
// would be the screen's own claim about the thing under test. Rows are located
// by their `zz-` subject, and "an empty list" is recognised by its sentence.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS, PER WIDTH — 18, AND THE NUMBER IS DECLARED, NOT FOUND
// ---------------------------------------------------------------------------
//  list screen (9)
//   words/sent-vs-delivered   the two rows read differently (3.1's done-when)
//   words/exact               ...and read "On its way" and "Delivered"
//   bad/red                   a bounced row is drawn in the fixed `--bad` red
//   bad/reason                ...with the provider's own reason beside it
//   null/no-link-no-chip      a row whose booking id is null draws nothing extra
//   booking/no-link           a row WITH a booking id draws no link either
//   fit/no-overflow           no sideways scroll, every row inside the viewport
//   order/newest-first        rows appear in the order the server sent them
//   tap/switch-44             the Everything / Problems switch is a real 44px target
//  problems screen (2)
//   filter/only-bad           every bad row, and ONLY bad rows
//   filter/asks-for-bad       the request carried exactly the five bad states
//  states (7)
//   empty/everything, empty/problems, failed/not-empty, failed/not-empty-shape, failed/retry-44,
//   failed/no-list, loading/not-empty
//
// 1 wire + 5 x 18 + 2 canaries = **93**, fixed by the question list. A width
// whose screen never renders books its 18 as failures rather than dropping out.
//
// THE TWO CANARIES RUN EVERY TIME:
//   * **the-same-word** — the delivered row's word is overwritten with
//     "On its way" and the comparator is asked. It must say SAME. If it says
//     DIFFERENT it is not reading the words.
//   * **the-placeholder-chip** — a "no booking" chip is injected into a null
//     row and the no-chip rule is asked. It must flag it.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, "artifacts", "email-list-admin");
const ARGS = process.argv.slice(2);
const HEADED = ARGS.includes("--headed");
const BREAK = (ARGS.find((a) => a.startsWith("--break=")) || "").split("=")[1] || null;

const U = process.env.SUPABASE_URL;
const K = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !K) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run `set -a; . ./.env; set +a` first.");
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
}

// 320x844 is the narrowest supported width — CLAUDE.md § Design.
const SIZES = [
  { w: 1920, h: 1080 }, { w: 1440, h: 900 }, { w: 768, h: 1024 },
  { w: 392, h: 844 }, { w: 320, h: 844 },
];
const PER_WIDTH = 18;
const EXPECTED_ASSERTIONS = 1 + SIZES.length * PER_WIDTH + 2;

// The five stored states a person has to act on. WRITTEN OUT HERE, NEVER
// IMPORTED FROM THE APP: the page derives its own list from `MAIL_STATE`, and a
// check that took its expectation from the thing under test would agree with it.
const BAD = ["bounced", "complained", "failed", "refused", "skipped"];

const REASON = "that address cannot receive email (550 5.1.1 user unknown)";
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
// Newest first, the way the server is asked to return them. Two rows carry a
// booking id and the rest do not; none of the five bad ones is special.
const FIX = [
  { slug: "zz-delivered", status: "delivered", booking: true,  min: 5 },
  { slug: "zz-sent",      status: "sent",      booking: false, min: 12 },
  { slug: "zz-bounced",   status: "bounced",   booking: true,  min: 30, detail: REASON },
  { slug: "zz-complained", status: "complained", booking: false, min: 60 },
  { slug: "zz-failed",    status: "failed",    booking: false, min: 90, detail: "the provider refused the message" },
  { slug: "zz-refused",   status: "refused",   booking: false, min: 120 },
  { slug: "zz-skipped",   status: "skipped",   booking: false, min: 150 },
  // The long one: an address and a business name that will not fit at 320.
  { slug: "zz-long", status: "delivered", booking: false, min: 200,
    to: "a-very-long-recipient-address-that-keeps-going@an-equally-long-example-domain-name.example.com",  // mail-sink: a fixture row fulfilled inside the browser; nothing is sent and no row is written
    business: "Zz The Extremely Long Business Name Detailing And Ceramic Coating Studio" },
];
const rowsFor = (statuses) => FIX.filter((f) => !statuses || statuses.includes(f.status)).map((f, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
  subject: `${f.slug}: your appointment`,
  to_email: f.to ?? `${f.slug}@customer.example.com`,  // mail-sink: a fixture row fulfilled inside the browser; nothing is sent and no row is written
  status: f.status,
  detail: f.detail ?? null,
  sent_at: ago(f.min),
  business_name: f.business ?? "Zz Detail Co",
  booking_id: f.booking ? `11111111-1111-4111-8111-${String(i + 1).padStart(12, "0")}` : null,
}));

const WORDS = { delivered: "Delivered", sent: "On its way" };
const EMPTY_ALL = /no email has been sent yet/i;
const EMPTY_BAD = /no email has bounced, been refused or failed to send/i;

/* THE RULES ARE PURE FUNCTIONS OVER A SNAPSHOT, so a canary can be run through
   the very same function the real rows are. A rule that lived inline in the
   walk could only be broken by editing the walk. */
const wordsDiffer = (a, b) => !!a && !!b && a.word !== b.word;
const hasExtras = (r) => r.kids !== 3 || r.links > 0;

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });

  const acct = await makeAdmin(U, K);
  if (!acct) throw new Error("could not make a platform-admin account");

  const failures = [], observed = [], canaries = [], missed = [], consoleBad = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions++;
    if (!cond) failures.push(`${id} — ${detail}`);
    return !!cond;
  };

  const browser = await chromium.launch({ headless: !HEADED });
  let ctx, page;
  try {
    ctx = await browser.newContext({ viewport: { width: SIZES[0].w, height: SIZES[0].h } });
    page = await ctx.newPage();
    page.on("console", (m) => {
      const t = m.type();
      if (t === "error" || t === "warning") consoleBad.push(`${t}: ${m.text().slice(0, 200)}`);
    });

    // ── THE INTERCEPT. `MODE` is read at request time. Only `email_list` is
    //    answered here; every other action goes to the real server. ──────────
    let MODE = "real";   // real | rows | empty | fail | noshape | slow
    let lastReal = null; // { status, body } — the un-rewritten answer
    let lastAsked = null;
    await page.route("**/functions/v1/platform-admin", async (route) => {
      let asked = null;
      try { asked = route.request().postDataJSON(); } catch { /* not JSON */ }
      if (asked?.action !== "email_list") return route.continue().catch(() => {});
      lastAsked = asked;
      const send = (status, obj) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(obj) }).catch(() => {});
      if (MODE === "real") {
        let res;
        try { res = await route.fetch(); } catch { return route.abort().catch(() => {}); }
        const body = await res.json().catch(() => null);
        lastReal = { status: res.status(), body };
        return send(res.status(), body);
      }
      if (MODE === "fail") return send(500, { error: "the mail table could not be read" });
      if (MODE === "noshape") return send(200, { nothing: "here" });
      if (MODE === "empty") return send(200, { rows: [] });
      // SABOTAGE `filter` BITES HERE: the client's own request is edited on the
      // way to the fake server, the way a client that listed four states would.
      let statuses = asked.statuses;
      if (BREAK === "filter" && Array.isArray(statuses)) statuses = statuses.filter((s) => s !== "bounced");
      if (MODE === "slow") await new Promise((r) => setTimeout(r, 1800));
      return send(200, { rows: rowsFor(statuses) });
    });

    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 25000 });
    await page.fill("input[type=email]", acct.email);
    await page.fill("input[type=password]", acct.password);
    await page.click("form button.pa-btn");
    await page.waitForSelector(".pa-tab", { timeout: 25000 });

    /* WAIT FOR THE THING, NEVER FOR A DURATION (docs/gotchas.md). */
    const openHealth = async () => {
      await page.waitForSelector(".pa-tab", { timeout: 20000 });
      const tabs = await page.$$eval(".pa-tab", (els) => els.map((e) => (e.textContent || "").trim()));
      const i = tabs.findIndex((t) => /system health/i.test(t));
      if (i < 0) throw new Error("no `System health` tab — the sign-in never went through");
      await page.click(`.pa-tab >> nth=${i}`);
      await page.waitForSelector(".pa-mail", { timeout: 20000 });
    };
    const stateOf = () => page.evaluate(() => document.querySelector("[data-mail-state]")?.getAttribute("data-mail-state") ?? null);
    const waitState = (s) => page.waitForSelector(`[data-mail-state=${s}]`, { timeout: 15000 });
    const waitRows = () => page.waitForSelector(".pa-mail .pa-svc-r", { timeout: 15000 });
    const settle = () => page.evaluate(() => Promise.race([
      Promise.all(document.getAnimations()
        .filter((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime))
        .map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 2500)),
    ]));
    const section = () => page.locator("section.pa-sec", { has: page.locator("h2", { hasText: "Email we sent" }) });
    const shoot = async (name) => {
      await section().scrollIntoViewIfNeeded().catch(() => {});
      await page.screenshot({ path: join(ART, name) });
    };
    const clickProblems = async () => {
      await page.click('.segmented button:has-text("Problems")');
    };

    // The red the screen claims for a bad outcome, read from the token itself.
    const readRows = () => page.evaluate(() => {
      const probe = document.createElement("i");
      probe.style.color = "var(--bad)";
      document.querySelector(".pa").appendChild(probe);
      const bad = getComputedStyle(probe).color;
      probe.remove();
      const out = [];
      for (const r of document.querySelectorAll(".pa-mail .pa-svc-r")) {
        const sub = (r.querySelector(".pa-svc-n")?.textContent || "").trim();
        const v = r.querySelector(".pa-v");
        const d = r.querySelector(".pa-svc-d");
        // A row below the fold has no element under its centre, and "unpainted"
        // would be the screen's fault when it is the probe's.
        r.scrollIntoView({ block: "center", inline: "nearest" });
        const rect = r.getBoundingClientRect();
        const vr = v?.getBoundingClientRect();
        let hit = false;
        if (vr && vr.width && vr.height) {
          const el = document.elementFromPoint(Math.round(vr.left + vr.width / 2), Math.round(vr.top + vr.height / 2));
          hit = !!el && (el === v || v.contains(el) || el.contains(v));
        }
        const cs = v ? getComputedStyle(v) : null;
        out.push({
          sub, slug: sub.split(":")[0],
          word: (v?.textContent || "").trim(),
          desc: (d?.textContent || "").trim(),
          red: !!cs && cs.color === bad,
          kids: r.children.length,
          links: r.querySelectorAll("a, button, [role=link], [role=button]").length,
          right: rect.right, left: rect.left,
          painted: !!(vr && vr.width > 0 && vr.height > 0 && hit && cs.visibility !== "hidden" && Number(cs.opacity) > 0),
        });
      }
      return out;
    });
    const pageFit = () => page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    }));
    // THE HIT AREA, NEVER THE RECT — scripts/lib/hitArea.mjs. `.segmented button`
    // is a 36px box that presses as 44 through a negative-inset `::after`, and a
    // rect-only probe calls that legal control broken. The overhang is read off
    // the element's own `::after`, then every pixel row from top to bottom is
    // asked who is there.
    const HIT = (sel) => page.evaluate((sel) => [...document.querySelectorAll(sel)].map((b) => {
      b.scrollIntoView({ block: "center", inline: "nearest" });
      const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
      const a = getComputedStyle(b, "::after");
      const o = a && a.content !== "none" && a.position === "absolute"
        ? { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) } : { top: 0, bottom: 0 };
      const r = b.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2);
      let n = 0;
      for (let y = Math.ceil(r.top - o.top); y <= Math.floor(r.bottom + o.bottom); y++) {
        const hit = document.elementFromPoint(x, y);
        if (hit && (hit === b || b.contains(hit))) n++;
      }
      return { h: n, text: (b.textContent || "").trim() };
    }), sel);
    const switchTargets = () => HIT(".segmented button");

    await openHealth();
    if (ARGS.includes("--crash-after-signin")) throw new Error("deliberate crash, proving the teardown runs");

    // ── TARGET 1 · THE WIRE. The only un-rewritten measurement here. ────────
    {
      MODE = "real"; lastReal = null;
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth();
      // Whatever the real function says, the screen must leave `loading`.
      await page.waitForFunction(() => {
        const s = document.querySelector("[data-mail-state]")?.getAttribute("data-mail-state");
        return s !== "loading" && (s || document.querySelector(".pa-mail .pa-svc-r"));
      }, null, { timeout: 20000 }).catch(() => {});
      await settle();
      const st = await stateOf();
      const rowsDrawn = (await readRows()).length;
      const wire = lastReal;
      const refused = !wire || wire.status >= 400 || !Array.isArray(wire.body?.rows);
      ok(wire && ((refused && st === "failed") || (!refused && (rowsDrawn > 0 || st === "empty"))),
        "wire/failed-says-failed",
        `the real server answered ${wire ? wire.status : "nothing"}${wire?.body?.error ? ` "${wire.body.error}"` : ""} `
        + `and the screen was in state "${st}" with ${rowsDrawn} row(s). A server that does not know the action `
        + "or cannot read the table must read as a FAILED read, never as an empty list.");
      observed.push(`wire: real server answered ${wire ? wire.status : "nothing"}`
        + `${wire?.body?.error ? ` "${wire.body.error}"` : ""} → screen state "${st}", ${rowsDrawn} row(s)`);
      await shoot("wire-real-screen.png");
    }

    for (const size of SIZES) {
      const tag = `${size.w}x${size.h}`;
      await page.setViewportSize({ width: size.w, height: size.h });

      // ── THE LIST SCREEN ───────────────────────────────────────────────────
      MODE = "rows";
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth();
      let drew = true;
      try { await waitRows(); } catch { drew = false; }
      if (!drew) {
        failures.push(`${tag} — the list screen did not render. A width that never drew is a failure, never a skip.`);
        assertions += PER_WIDTH;
        continue;
      }
      await settle();

      if (BREAK === "collapse") {
        await page.evaluate(() => document.querySelectorAll(".pa-mail .pa-v").forEach((v) => {
          if (/On its way/.test(v.textContent)) v.lastChild.textContent = "Delivered";
        }));
      }
      if (BREAK === "placeholder") {
        await page.evaluate(() => document.querySelectorAll(".pa-mail .pa-svc-r").forEach((r) => {
          if (/zz-sent|zz-complained/.test(r.textContent)) {
            const c = document.createElement("span"); c.textContent = "no booking"; r.appendChild(c);
          }
        }));
      }

      const rows = await readRows();
      const by = (slug) => rows.find((r) => r.slug === slug);
      const dl = by("zz-delivered"), sn = by("zz-sent"), bn = by("zz-bounced");
      await shoot(`${tag}-list.png`);

      ok(wordsDiffer(dl, sn), "words/sent-vs-delivered",
        `${tag}: "sent" reads "${sn?.word}" and "delivered" reads "${dl?.word}". 3.1's own done-when is `
        + "that a delivered message is visibly different from one merely sent.");
      ok(dl?.word === WORDS.delivered && sn?.word === WORDS.sent, "words/exact",
        `${tag}: the words are "${dl?.word}" / "${sn?.word}"; the client and job records say "Delivered" / "On its way" — `
        + "a second vocabulary for the same column is how two screens disagree.");
      ok(bn?.red === true && bn.word === "Bounced", "bad/red",
        `${tag}: the bounced row reads "${bn?.word}" with red=${bn?.red}. A bad outcome is drawn in the fixed --bad red.`);
      ok(!!bn && bn.desc.includes(REASON), "bad/reason",
        `${tag}: the bounced row's second line is "${bn?.desc?.slice(0, 80)}" — the provider's own reason must be there.`);
      const nulls = rows.filter((r) => /zz-(sent|complained|failed|refused|skipped|long)/.test(r.slug));
      ok(nulls.length === 6 && nulls.every((r) => !hasExtras(r)), "null/no-link-no-chip",
        `${tag}: ${nulls.filter(hasExtras).map((r) => r.slug).join(", ") || "(rows missing)"} drew something beyond the three plain `
        + "parts for a null booking id. A null id is correct for campaigns and invites; a greyed-out chip makes it look like a fault.");
      const linked = rows.filter((r) => /zz-(delivered|bounced)$/.test(r.slug));
      ok(linked.length === 2 && linked.every((r) => !hasExtras(r)), "booking/no-link",
        `${tag}: a row with a booking id drew a link or control. \`/admin/job/:id\` is not a route and \`/job/:id\` `
        + "is the detailer's own screen, so there is nowhere correct to link yet.");
      const fit = await pageFit();
      ok(fit.sw <= fit.iw && rows.every((r) => r.left >= -0.5 && r.right <= fit.iw + 0.5) && rows.every((r) => r.painted),
        "fit/no-overflow",
        `${tag}: scrollWidth ${fit.sw} against a ${fit.iw}px window; `
        + `${rows.filter((r) => r.right > fit.iw + 0.5).map((r) => r.slug).join(", ") || "no row"} past the edge; `
        + `${rows.filter((r) => !r.painted).map((r) => r.slug).join(", ") || "all"} unpainted.`);
      const order = rows.map((r) => r.slug).join(",");
      const want = FIX.map((f) => f.slug).join(",");
      ok(order === want, "order/newest-first", `${tag}: rows read ${order}; the server sent ${want}.`);
      const sw = await switchTargets();
      ok(sw.length === 2 && sw.every((b) => b.h >= 44), "tap/switch-44",
        `${tag}: the Everything / Problems switch presses as ${JSON.stringify(sw)} — 44px of real hit area is an absolute.`);

      if (size.w === SIZES[0].w) {
        // ── CANARY 1 · the delivered row made to read like the sent one. ────
        const fake = { ...dl, word: sn.word };
        const saysDifferent = wordsDiffer(fake, sn);
        canaries.push(`the-same-word: delivered row overwritten with "${sn.word}" — comparator says ${saysDifferent ? "DIFFERENT" : "SAME"}`);
        if (saysDifferent) missed.push("CANARY MISSED: the-same-word — two rows with the same word were reported as DIFFERENT. The comparator is not reading the words.");
        // ── CANARY 2 · a chip on a null row, asked of the real rule. ────────
        const chipped = { ...sn, kids: 4 };
        canaries.push(`the-placeholder-chip: null row given a fourth child — rule says ${hasExtras(chipped) ? "FLAGGED" : "PASSED"}`);
        if (!hasExtras(chipped)) missed.push("CANARY MISSED: the-placeholder-chip — a row with a chip on it passed the no-chip rule.");
        await page.screenshot({ path: join(ART, "canary-list.png") });
      }

      // ── THE PROBLEMS SCREEN ──────────────────────────────────────────────
      lastAsked = null;
      await clickProblems();
      await page.waitForFunction(() => !document.querySelector("[data-mail-state=loading]")
        && document.querySelectorAll(".pa-mail .pa-svc-r").length > 0, null, { timeout: 15000 }).catch(() => {});
      await settle();
      const bad = await readRows();
      const gotBad = bad.map((r) => r.slug).sort().join(",");
      const wantBad = FIX.filter((f) => BAD.includes(f.status)).map((f) => f.slug).sort().join(",");
      await shoot(`${tag}-problems.png`);
      ok(gotBad === wantBad, "filter/only-bad",
        `${tag}: Problems shows [${gotBad}] and should show exactly [${wantBad}] — every bad row, and no good one.`);
      const asked = (lastAsked?.statuses ?? []).slice().sort().join(",");
      ok(asked === BAD.slice().sort().join(","), "filter/asks-for-bad",
        `${tag}: the Problems request asked for [${asked}]; the five states that need a person are [${BAD.slice().sort().join(",")}].`);

      // ── THE STATES ───────────────────────────────────────────────────────
      MODE = "empty";
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth();
      await waitState("empty").catch(() => {});
      await settle();
      const e1 = await page.evaluate(() => document.querySelector("[data-mail-state=empty]")?.textContent ?? "");
      await clickProblems();
      await page.waitForFunction((re) => new RegExp(re, "i").test(document.querySelector("[data-mail-state=empty]")?.textContent ?? ""),
        EMPTY_BAD.source, { timeout: 8000 }).catch(() => {});
      await settle();
      const e2 = await page.evaluate(() => document.querySelector("[data-mail-state=empty]")?.textContent ?? "");
      await shoot(`${tag}-empty.png`);
      ok(EMPTY_ALL.test(e1), "empty/everything", `${tag}: an empty list under Everything reads "${e1}".`);
      const diag = await page.evaluate(() => `state=${document.querySelector("[data-mail-state]")?.getAttribute("data-mail-state")} on=${document.querySelector(".segmented button.on")?.textContent}`);
      ok(EMPTY_BAD.test(e2), "empty/problems", `${tag}: an empty list under Problems reads "${e2}" (${diag}) — it must not claim nothing was ever sent.`);

      MODE = "fail";
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth();
      await waitState("failed").catch(() => {});
      if (BREAK === "failempty") {
        await page.evaluate(() => {
          const f = document.querySelector("[data-mail-state=failed]");
          if (f) { const p = document.createElement("p"); p.className = "pa-none"; p.setAttribute("data-mail-state", "empty"); p.textContent = "No email has been sent yet."; f.replaceWith(p); }
        });
      }
      await settle();
      const failedState = await stateOf();
      const failedText = await page.evaluate(() => document.querySelector(".pa-mail")?.innerText ?? "");
      const retry = (await HIT(".pa-mail .pa-acts button")).find((x) => /try again/i.test(x.text)) ?? null;
      const failedRows = (await readRows()).length;
      await shoot(`${tag}-failed.png`);
      ok(failedState === "failed" && !EMPTY_ALL.test(failedText), "failed/not-empty",
        `${tag}: a 500 from the server left the screen in state "${failedState}" reading "${failedText.slice(0, 80)}". `
        + "A failed read must never be drawn as the empty list.");
      ok(!!retry && retry.h >= 44, "failed/retry-44",
        `${tag}: Try again is ${JSON.stringify(retry)} — a failed screen needs a way out and it is a 44px target.`);
      ok(failedRows === 0 && /the mail table could not be read/.test(failedText), "failed/no-list",
        `${tag}: after a failure the screen drew ${failedRows} row(s) and read "${failedText.slice(0, 80)}"; `
        + "it must say what the server said and show no list.");

      MODE = "noshape";
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth();
      await waitState("failed").catch(() => {});
      await settle();
      const shapeState = await stateOf();
      const shapeText = await page.evaluate(() => document.querySelector(".pa-mail")?.innerText ?? "");
      ok(shapeState === "failed" && !EMPTY_ALL.test(shapeText), "failed/not-empty-shape",
        `${tag}: a 200 with no \`rows\` list left the screen in state "${shapeState}". It must read as failed, not as an empty list.`);
      
      MODE = "slow";
      await page.reload({ waitUntil: "domcontentloaded" });
      await openHealth();
      await waitState("loading").catch(() => {});
      await settle();
      const loadState = await stateOf();
      const loadText = await page.evaluate(() => document.querySelector(".pa-mail")?.innerText ?? "");
      await shoot(`${tag}-loading.png`);
      ok(loadState === "loading" && !EMPTY_ALL.test(loadText) && !EMPTY_BAD.test(loadText), "loading/not-empty",
        `${tag}: while the answer is on its way the screen is in state "${loadState}" and reads "${loadText.slice(0, 60)}". `
        + "Not knowing yet must not read as having nothing.");
      await waitRows().catch(() => {});
    }
  } finally {
    // NEVER THROWS, AND RUNS ON EVERY PATH — docs/gotchas.md: a fixture that
    // outlives its task is a standing all-seeing account.
    try { await page?.unrouteAll({ behavior: "ignoreErrors" }); } catch { /* closing anyway */ }
    try { await browser.close(); } catch { /* closing anyway */ }
    await dropAdmin(U, K, acct.id);
  }

  // ── The count is declared and it is an EQUALITY (docs/gotchas.md 98). ─────
  if (!failures.some((f) => /did not render/.test(f)) && assertions + 2 !== EXPECTED_ASSERTIONS) {
    failures.push(`assertion count — ran ${assertions + 2} against a declared ${EXPECTED_ASSERTIONS}; a question was added or dropped without the floor moving.`);
  }

  const FORGIVEN = /React Router Future Flag Warning/;
  // THE SERVER'S OWN REFUSALS, FORGIVEN BY NAME. The deployed function answers
  // `email_list` with 400 until it is republished, and the browser logs every
  // non-2xx fetch as a console error. That is the wire target working, not a
  // defect in the screen; anything else in the console still is.
  const REFUSAL = /Failed to load resource: the server responded with a status of (400|500)/;
  const uniq = [...new Set(consoleBad)];
  const forgiven = uniq.filter((c) => FORGIVEN.test(c));
  const refusals = uniq.filter((c) => REFUSAL.test(c));
  for (const c of uniq.filter((c) => !FORGIVEN.test(c) && !REFUSAL.test(c))) failures.push(`console — ${c}`);
  if (forgiven.length) observed.push(`console: ${forgiven.length} React Router future-flag warning(s) FORGIVEN BY NAME — dev-only router setup`);
  if (refusals.length) observed.push(`console: ${refusals.length} browser log line(s) for a 400/500 FORGIVEN BY NAME — the wire target and the fail state ask for exactly that`);

  const targets = 1 + SIZES.length * 3;
  const { path, receipt } = writeReceipt({
    check_id: "email-list-admin",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status: failures.length || missed.length ? "fail" : "pass",
    expected_targets: targets,
    discovered_targets: targets,
    attempted_targets: targets,
    completed_targets: targets,
    skipped_targets: 0,
    assertions_executed: assertions + 2,
    min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor:
      "1 wire question + 5 widths x 18 (9 list, 2 problems, 7 states) + 2 canaries = 93. Structural: fixed by "
      + "the question list, never by what the run finds, and asserted as an EQUALITY at the end of the run.",
    failures: [...failures, ...missed],
    warnings: [
      "The rows are injected by answering `email_list` IN THE BROWSER. Nothing is written to `email_sends`. "
      + "It measures the DISPLAY. The server action that feeds it did not exist when this was written.",
      "Target 1 is the real un-rewritten answer. Against today's deployed function that is a 400, and the "
      + "assertion is that the screen says FAILED — which is the only thing that can be proved about the "
      + "success path until the function is republished and the migration applied.",
      "Rows are located by the `zz-` subject this script invented, never by the screen's own `data-mail-state`.",
      "The four --break= sabotages are applied to the LIVE page or to the request on the wire, not to a source "
      + "file: nothing in app/src is edited while a browser script is running.",
      "It does NOT prove the booking id arrives from the real database, or that any row is real mail.",
    ],
    artifacts: [
      "artifacts/email-list-admin/wire-real-screen.png",
      "artifacts/email-list-admin/canary-list.png",
      ...SIZES.flatMap((s) => ["list", "problems", "empty", "failed", "loading"].map((n) => `artifacts/email-list-admin/${s.w}x${s.h}-${n}.png`)),
    ],
    dimensions: {
      sizes: SIZES.map((s) => `${s.w}x${s.h}`),
      observed, canaries, sabotage: BREAK,
      console_errors_and_warnings: uniq.slice(0, 10),
      console_forgiven_by_name: [...forgiven, ...refusals],
    },
    canary: {
      id: "the-same-word",
      observed_failure: missed.length === 0,
      problems: missed,
    },
  });

  for (const line of observed) console.log("  " + line);
  for (const c of canaries) console.log("  canary " + c);
  console.log("");
  const badCount = failures.length + missed.length;
  if (badCount) {
    console.log(`FAIL  email-list-admin — ${badCount} finding(s)`);
    for (const f of [...failures, ...missed]) console.log("  · " + f);
  } else {
    console.log(`PASS  email-list-admin — ${receipt.completed_targets} targets, ${receipt.assertions_executed} assertions, both canaries caught`);
  }
  console.log("receipt: " + path.replace(REPO + "\\", "").replace(REPO + "/", ""));
  process.exit(badCount ? 1 : 0);
}

run().catch((e) => {
  console.error("email-list-admin could not run: " + e.message);
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
});
