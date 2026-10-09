// CAN A DETAILER, ON THEIR OWN DASHBOARD, TELL WHETHER THEIR BUSINESS'S EMAIL
// IS ARRIVING — AND IS EVERY ROW ON THAT LIST THEIRS?
//
//   node scripts/mail-log.mjs
//   node scripts/mail-log.mjs --headed
//   node scripts/mail-log.mjs --break=noaddr     # sabotage: the recipient line removed
//   node scripts/mail-log.mjs --break=collapse   # sabotage: "sent" drawn as "Delivered"
//   node scripts/mail-log.mjs --break=clip       # sabotage: the address line put back to nowrap+ellipsis
//   node scripts/mail-log.mjs --break=failempty  # sabotage: a failed read drawn as the empty list
//   node scripts/mail-log.mjs --break=filter     # sabotage: Problems asks without "bounced"
//   node scripts/mail-log.mjs --break=foreign    # sabotage: another business's row injected into the list
//
// Needs the dev server, the seed, and `.env` loaded (`set -a; . ./.env; set +a`).
// It signs in as the demo tenant's OWNER and writes nothing anywhere.
//
// ROADMAP 3.1, the detailer half. Andrew, 2026-10-09: *"both should be able to
// see."*
//
// ---------------------------------------------------------------------------
// THE SUCCESS PATH IS REAL HERE, WHICH THE BACK OFFICE'S OWN WALK CANNOT DO
// ---------------------------------------------------------------------------
// `email-list-admin.mjs` feeds `/admin` eight invented rows, because the
// `platform-admin` action that serves them is not deployed and the migration is
// not applied. **This screen needs neither.** `email_sends` has a `for select`
// policy scoped by `current_business_ids()`, so the detailer's own session
// returns their own rows straight from the live table — and `demo-detail`
// already holds **four bounced and four delivered** rows from the 2026-10-06
// test sends, which is 3.1's done-when evidence sitting in the database.
//
// So TARGET A is the un-rewritten read: the browser asks the real PostgREST and
// the rows on the screen are compared, in order, against an INDEPENDENT read
// taken here over the service role. **Zero rows is a failure, never a pass.**
//
// ---------------------------------------------------------------------------
// WHAT THE REAL ROWS CANNOT ANSWER, AND WHAT IS INTERCEPTED FOR IT
// ---------------------------------------------------------------------------
// `demo-detail` has no `sent` row and no long address, so two questions cannot
// be asked of real data:
//   * 3.1's own done-when — *is a delivered message visibly different from one
//     merely sent* — needs a `sent` row beside a `delivered` one.
//   * the new `.row-item .sub.addr` rule exists because a long address clips to
//     "jordan.mcall…" at 320, and every real address here is short.
// TARGET B answers both by fulfilling the REST read inside the browser with
// one fixture row per stored state, plus a deliberately long address. Nothing
// is written to `email_sends` on either path.
//
// ---------------------------------------------------------------------------
// WHAT IT ASSERTS, PER WIDTH — 20, DECLARED RATHER THAN COUNTED
// ---------------------------------------------------------------------------
//  the real list (8)
//   real/rows-match        the drawn rows are exactly the table's, IN ORDER
//   real/not-empty         ...and there is at least one (a discovery FLOOR)
//   real/recipient         every row draws its own `to_email`, exactly
//   real/delivered-green   the delivered rows read "Delivered" with a tick
//   real/bounced-red       the bounced rows read "Bounced" in --bad ...
//   real/bounced-reason    ...with the provider's own stored words beside them
//   real/no-cap-line       29 rows must not carry a "100 most recent." line
//   real/scope             no row on it belongs to another business
//  the switch (1)
//   tap/switch-44          Everything / Problems is a real 44px target
//  the problems filter (1)
//   real/problems-only-bad exactly the bad rows the table holds, no good one
//  the fixture list (5)
//   fix/words-differ       "sent" and "delivered" do not read the same
//   fix/words-exact        ...and read "On its way" / "Delivered"
//   fix/addr-every-row     every fixture row draws its address
//   fix/addr-unclipped     the long address is not cut off at this width
//   fix/fit                no sideways scroll, every row inside the viewport
//  the states (5)
//   empty/everything, empty/problems, failed/not-empty, failed/retry-44, loading/not-empty
//
// 5 widths x 20 + 3 canaries = **103**, fixed by the question list and asserted
// as an EQUALITY (docs/gotchas.md 98). A width whose screen never renders books
// its 20 as failures rather than dropping out.
//
// THE THREE CANARIES RUN EVERY TIME, and each is aimed at a rule that would
// otherwise be satisfied by nothing happening:
//   * **the-same-word** — the delivered row's word is overwritten with "On its
//     way" and the comparator is asked. It must say SAME.
//   * **the-clipped-address** — the fit rule is handed a snapshot whose address
//     overflows its box. It must flag it. Without this, `scrollWidth <=
//     clientWidth` is trivially true for every short address and the rule tests
//     nothing.
//   * **the-foreign-row** — the scope rule is handed a row the business does
//     not hold. It must flag it. Without this, "every drawn row is mine" is
//     satisfied by an empty list.

import { createRequire } from "node:module";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { REPO, writeReceipt } from "./receipt.mjs";
import { demoOwner, demoOwnerEmail } from "./lib/demoOwner.mjs";

const { chromium } = createRequire(import.meta.url)("./../app/node_modules/playwright/index.js");

const BASE = process.env.BASE_URL || process.env.BASE || "http://localhost:5173";
const ART = join(REPO, "artifacts", "mail-log");
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
const PER_WIDTH = 20;
const EXPECTED_ASSERTIONS = SIZES.length * PER_WIDTH + 3;
const CAP = 100;   // the screen's own limit; the cap sentence may only draw at this many rows

// The states that need a person. WRITTEN OUT, NEVER IMPORTED FROM THE APP: the
// screen derives its own list from `MAIL_STATE`, and a check that took its
// expectation from the thing under test would agree with it by construction.
const BAD = ["bounced", "complained", "failed", "refused", "skipped"];
const WORDS = { delivered: "Delivered", sent: "On its way" };
const EMPTY_ALL = /no email has been sent yet/i;
const EMPTY_BAD = /nothing has bounced, been refused or failed to send/i;

const rest = async (path) => {
  const res = await fetch(`${U}/rest/v1/${path}`, {
    headers: { apikey: K, Authorization: `Bearer ${K}` },
  });
  if (!res.ok) throw new Error(`REST ${res.status} on ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
};

// LONG ENOUGH TO OVERFLOW AT EVERY WIDTH THIS CHECK WALKS, including the
// second column at 1920 — a fit rule that only bites on a phone would let the
// desk regress silently.
const LONG_ADDR = "jordan.mcallister-fitzwilliam.the-third+appointments-and-receipts@an-extremely-long-example-domain-name-for-testing.example.com";  // mail-sink: a fixture fulfilled inside the browser; nothing is sent and no row is written
const REASON = "that address cannot receive email (550 5.1.1 user unknown)";
const ago = (m) => new Date(Date.now() - m * 60000).toISOString();
// One row per stored state, newest first, and the eighth is the long address.
const FIX = [
  { tag: "zz-delivered", status: "delivered", min: 5 },
  { tag: "zz-sent", status: "sent", min: 12 },
  { tag: "zz-bounced", status: "bounced", min: 30, detail: REASON },
  { tag: "zz-complained", status: "complained", min: 60 },
  { tag: "zz-failed", status: "failed", min: 90, detail: "the provider refused the message" },
  { tag: "zz-refused", status: "refused", min: 120 },
  { tag: "zz-skipped", status: "skipped", min: 150 },
  { tag: "zz-long", status: "delivered", min: 200, to: LONG_ADDR },
];
const fixtureRows = (statuses) => FIX
  .filter((f) => !statuses || statuses.includes(f.status))
  .map((f, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    subject: `${f.tag}: your appointment`,
    to_email: f.to ?? `${f.tag}@customer.example.com`,  // mail-sink: a fixture fulfilled inside the browser
    status: f.status,
    detail: f.detail ?? null,
    sent_at: ago(f.min),
  }));

/* THE RULES ARE PURE FUNCTIONS OVER A SNAPSHOT, so a canary can be run through
   the very same function the real rows are. A rule that lived inline in the
   walk could only be broken by editing the walk — `docs/gotchas.md` 95. */
const wordsDiffer = (a, b) => !!a && !!b && a.word !== b.word;
const addrClipped = (r) => !r || !r.addrBox || r.addrScrollW > r.addrClientW + 0.5;
const foreignRows = (drawn, mine) => drawn.filter((k) => !mine.has(k));

async function run() {
  rmSync(ART, { recursive: true, force: true });
  mkdirSync(ART, { recursive: true });

  // ── THE INDEPENDENT READ. Taken over the service role, before the browser is
  //    opened, so the screen is compared against the TABLE rather than against
  //    itself. Read-only; nothing here writes. ─────────────────────────────────
  const biz = await rest("businesses?select=id,name,timezone&slug=eq.demo-detail");
  if (!biz.length) throw new Error("no `demo-detail` business — run `node scripts/seed-demo.mjs` first");
  const BID = biz[0].id;
  const sel = "select=id,subject,to_email,status,detail,sent_at";
  const TRUTH = await rest(`email_sends?${sel}&business_id=eq.${BID}&order=sent_at.desc,id.desc&limit=${CAP}`);
  const TRUTH_BAD = await rest(
    `email_sends?${sel}&business_id=eq.${BID}&status=in.(${BAD.join(",")})&order=sent_at.desc,id.desc&limit=${CAP}`);
  const MINE_KEYS = new Set(TRUTH.map((r) => `${r.subject}|${r.to_email}`));
  // A row this business does NOT own, for the `foreign` sabotage, and it has to
  // be one whose subject+address this business does not also hold — otherwise
  // the sabotage would be undetectable by construction and its clean run would
  // be read as the rule working. Read, never written.
  const OTHER = (await rest(`email_sends?${sel}&business_id=neq.${BID}&limit=200`))
    .filter((r) => !MINE_KEYS.has(`${r.subject}|${r.to_email}`));

  if (TRUTH.length === 0) {
    console.error("`demo-detail` has no rows in `email_sends`, so the real half of this check has nothing to");
    console.error("measure. That is a FAILURE of the check's premise, not a pass. Re-seed, or send one email.");
    process.exit(2);
  }

  const failures = [], observed = [], canaries = [], missed = [], consoleBad = [], sabotage = [];
  let assertions = 0;
  const ok = (cond, id, detail) => {
    assertions++;
    if (!cond) failures.push(`${id} — ${detail}`);
    return !!cond;
  };

  const tally = TRUTH.reduce((a, r) => ({ ...a, [r.status]: (a[r.status] || 0) + 1 }), {});
  observed.push(`the table holds ${TRUTH.length} row(s) for demo-detail: ${JSON.stringify(tally)}`);
  observed.push(`${TRUTH_BAD.length} of those are states that need a person (${BAD.join(", ")})`);
  observed.push(`${OTHER.length} row(s) belong to other businesses and are available to the \`foreign\` sabotage`);

  const browser = await chromium.launch({ headless: !HEADED });
  let ctx, page;
  try {
    ctx = await browser.newContext({ viewport: { width: SIZES[0].w, height: SIZES[0].h } });
    page = await ctx.newPage();
    page.on("console", (m) => {
      const t = m.type();
      if (t === "error" || t === "warning") consoleBad.push(`${t}: ${m.text().slice(0, 200)}`);
    });
    page.on("pageerror", (e) => consoleBad.push(`pageerror: ${String(e).slice(0, 200)}`));

    // ── THE INTERCEPT. `MODE` is read at request time, and `real` lets the
    //    browser's own query through untouched. Only THIS screen's read is
    //    touched: the client record's trail carries `customer_id` and a job's
    //    carries `to_email`, so both are recognised and passed through. ────────
    let MODE = "real";   // real | fixture | empty | fail | slow
    let lastAsked = null;
    await page.route("**/rest/v1/email_sends*", async (route) => {
      const url = route.request().url();
      if (/customer_id=|to_email=/.test(url)) return route.continue().catch(() => {});
      lastAsked = url;
      const send = (status, obj) => route.fulfill({
        status, contentType: "application/json", body: JSON.stringify(obj),
      }).catch(() => {});
      if (MODE === "real") {
        // SABOTAGE `filter` AND `foreign` BITE ON THE WIRE, never in a source
        // file: nothing under app/src is edited while a browser script runs.
        if (BREAK === "filter" && /status=in\./.test(url)) {
          const edited = url.replace(/status=in\.%28([^)]*?)%29|status=in\.\(([^)]*)\)/, (m0) => m0
            .replace(/bounced%2C|bounced,/, "")
            .replace(/%2Cbounced|,bounced/, ""));
          const res = await route.fetch({ url: edited }).catch(() => null);
          if (!res) return route.abort().catch(() => {});
          sabotage.push(`filter: the Problems request was rewritten on the wire — ${edited !== url ? "bounced removed" : "NO CHANGE MADE"}`);
          return send(res.status(), await res.json().catch(() => []));
        }
        let res;
        try { res = await route.fetch(); } catch { return route.abort().catch(() => {}); }
        let body = await res.json().catch(() => null);
        if (BREAK === "foreign" && Array.isArray(body) && OTHER.length) {
          body = [OTHER[0], ...body];
          sabotage.push(`foreign: another business's row "${OTHER[0].subject.slice(0, 40)}" was spliced into the answer`);
        }
        return send(res.status(), body);
      }
      if (MODE === "fail") return send(500, { message: "the mail table could not be read" });
      if (MODE === "empty") return send(200, []);
      if (MODE === "slow") await new Promise((r) => setTimeout(r, 1800));
      const m = decodeURIComponent(url).match(/status=in\.\(([^)]*)\)/);
      return send(200, fixtureRows(m ? m[1].split(",") : null));
    });

    await page.goto(`${BASE}/app`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 30000 });
    await page.fill("input[type=email]", demoOwnerEmail);
    await page.fill("input[type=password]", demoOwner().password);
    await page.click("form button.btn.primary");
    await page.waitForSelector(".tabbar", { timeout: 30000 });

    /* WAIT FOR THE THING, NEVER FOR A DURATION — docs/gotchas.md. */
    const settle = () => page.evaluate(() => Promise.race([
      Promise.all(document.getAnimations()
        .filter((a) => a.playState === "running" && Number.isFinite(a.effect?.getComputedTiming?.().endTime))
        .map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 2500)),
    ]));
    // THE GEAR IS REACHED BY ITS TOUR NAME, NOT BY ITS LABEL — a rename of
    // "Settings" would silently blind this walk, which is what
    // `scripts/label-guard.mjs` exists for and what a data attribute avoids.
    const openMail = async () => {
      await page.waitForSelector('[data-tour="gear"]', { timeout: 25000 });
      await page.click('[data-tour="gear"]');
      await page.waitForSelector('[data-settings-key="mail"]', { timeout: 20000 });
      await page.click('[data-settings-key="mail"]');
      await page.waitForSelector("[data-mail-log]", { timeout: 20000 });
    };
    const reopen = async () => {
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForSelector(".tabbar", { timeout: 30000 });
      await openMail();
    };
    const doneLoading = () => page.waitForFunction(() => {
      const c = document.querySelector("[data-mail-log]");
      return !!c && !c.querySelector('.rows[aria-busy="true"]');
    }, null, { timeout: 25000 }).catch(() => {});
    const text = () => page.evaluate(() => document.querySelector("[data-mail-log]")?.innerText ?? "");
    const shoot = (name) => page.screenshot({ path: join(ART, name) });

    // THE ADDRESS LINE IS MEASURED BY ITS OWN OVERFLOW, not by eye: `.sub`
    // clips with an ellipsis and clipped text has a perfectly normal box
    // (theme.css's own warning), so the only tell is scrollWidth > clientWidth.
    const readRows = () => page.evaluate(() => {
      const c = document.querySelector("[data-mail-log]");
      if (!c) return [];
      const probe = document.createElement("i");
      probe.style.color = "var(--bad)";
      c.appendChild(probe);
      const bad = getComputedStyle(probe).color;
      probe.remove();
      const out = [];
      for (const r of c.querySelectorAll(".row-item")) {
        // A row below the fold has no element under its centre, and "unpainted"
        // would be the probe's fault rather than the screen's.
        r.scrollIntoView({ block: "center", inline: "nearest" });
        const nm = r.querySelector(".nm");
        const addr = r.querySelector(".sub.addr");
        const sub = r.querySelector(".sub.clamp2");
        const word = sub?.querySelector("span");
        const rect = r.getBoundingClientRect();
        const wr = word?.getBoundingClientRect();
        let hit = false;
        if (wr && wr.width && wr.height) {
          const el = document.elementFromPoint(
            Math.round(wr.left + wr.width / 2), Math.round(wr.top + wr.height / 2));
          hit = !!el && (el === word || word.contains(el) || el.contains(word));
        }
        const wc = word ? getComputedStyle(word) : null;
        out.push({
          subject: (nm?.textContent || "").trim(),
          addr: addr ? (addr.textContent || "").trim() : null,
          addrBox: !!addr,
          addrScrollW: addr ? addr.scrollWidth : 0,
          addrClientW: addr ? addr.clientWidth : 0,
          word: (word?.textContent || "").trim(),
          line: (sub?.textContent || "").trim(),
          red: !!wc && wc.color === bad,
          marks: r.querySelectorAll("svg").length,
          left: rect.left, right: rect.right,
          painted: !!(wr && wr.width > 0 && wr.height > 0 && hit
            && wc.visibility !== "hidden" && Number(wc.opacity) > 0),
        });
      }
      return out;
    });
    const pageFit = () => page.evaluate(() => ({
      sw: document.documentElement.scrollWidth, iw: window.innerWidth,
    }));
    // THE HIT AREA, NEVER THE BOUNDING RECT — CLAUDE.md § Design. `.segmented
    // button` is a box smaller than 44 that presses as 44 through a
    // negative-inset `::after`, and a rect-only probe calls that legal control
    // broken. The overhang is read off the element's own `::after`.
    const HIT = (sel) => page.evaluate((s) => [...document.querySelectorAll(s)].map((b) => {
      b.scrollIntoView({ block: "center", inline: "nearest" });
      const px = (v) => (v && v.endsWith("px") ? parseFloat(v) : 0);
      const a = getComputedStyle(b, "::after");
      const o = a && a.content !== "none" && a.position === "absolute"
        ? { top: Math.max(0, -px(a.top)), bottom: Math.max(0, -px(a.bottom)) } : { top: 0, bottom: 0 };
      const r = b.getBoundingClientRect();
      const x = Math.round(r.left + r.width / 2);
      let n = 0;
      for (let y = Math.ceil(r.top - o.top); y <= Math.floor(r.bottom + o.bottom); y++) {
        const el = document.elementFromPoint(x, y);
        if (el && (el === b || b.contains(el))) n++;
      }
      return { h: n, text: (b.textContent || "").trim() };
    }), sel);
    // **PRESSING THE SWITCH AND THEN WAITING FOR "NOT BUSY" IS A RACE, AND IT
    //   WAS CAUGHT BY A THROWAWAY SCREENSHOT PROBE RATHER THAN BY THIS CHECK.**
    //   The press sets `which`; an effect then calls `load()`, which sets
    //   `rows` to null. That is two renders away, so a poll for
    //   `!aria-busy` fired on the frame of the click is satisfied by the
    //   list that is STILL SHOWING — and `readRows()` then measures the
    //   Everything rows while the screen is labelled Problems. The real run
    //   happened to win this race at all five widths, which is luck, not a
    //   guard (`docs/gotchas.md`'s standing subject).
    //   So: wait for busy to APPEAR first, and tolerate never seeing it — a
    //   five-second wait is long past the two renders either way, so by the
    //   time it gives up the new state is on screen regardless.
    const clickProblems = async () => {
      await page.click('[data-mail-log] .segmented button >> nth=1');
      await page.waitForSelector('[data-mail-log] .rows[aria-busy="true"]',
        { state: "attached", timeout: 5000 }).catch(() => {});
    };

    // THE LIVE-PAGE SABOTAGES. Applied to the rendered page, and each one
    // REPORTS WHETHER IT LANDED — `docs/gotchas.md` 102: an edit that silently
    // matched nothing prints the same green a caught sabotage does.
    const sabotagePage = async (where) => {
      if (BREAK === "noaddr") {
        const n = await page.evaluate(() => {
          const els = [...document.querySelectorAll("[data-mail-log] .sub.addr")];
          els.forEach((e) => e.remove());
          return els.length;
        });
        sabotage.push(`noaddr @${where}: ${n} recipient line(s) removed from the rendered page`);
      }
      if (BREAK === "collapse") {
        const n = await page.evaluate(() => {
          let k = 0;
          document.querySelectorAll("[data-mail-log] .sub.clamp2 span").forEach((s) => {
            if (/On its way/.test(s.textContent)) { s.textContent = "Delivered"; k++; }
          });
          return k;
        });
        sabotage.push(`collapse @${where}: ${n} "On its way" word(s) overwritten with "Delivered"`);
      }
      if (BREAK === "clip") {
        const n = await page.evaluate(() => {
          const els = [...document.querySelectorAll("[data-mail-log] .sub.addr")];
          els.forEach((e) => {
            e.style.whiteSpace = "nowrap";
            e.style.overflow = "hidden";
            e.style.textOverflow = "ellipsis";
            e.style.overflowWrap = "normal";
          });
          return els.length;
        });
        sabotage.push(`clip @${where}: ${n} recipient line(s) forced back to nowrap + ellipsis`);
      }
    };

    for (const size of SIZES) {
      const tag = `${size.w}x${size.h}`;
      await page.setViewportSize({ width: size.w, height: size.h });

      // ── TARGET A · THE REAL LIST, un-rewritten, from the live table ─────────
      MODE = "real";
      await reopen();
      await doneLoading();
      await settle();
      if ((await readRows()).length === 0) {
        failures.push(`${tag} — the real list did not render. A width that never drew is a failure, never a `
          + `skip. The table holds ${TRUTH.length} row(s) and the screen read `
          + `"${(await text()).replace(/\s+/g, " ").slice(0, 140)}".`);
        assertions += PER_WIDTH;
        continue;
      }
      await sabotagePage("real");
      const rows = await readRows();
      await shoot(`${tag}-real.png`);

      // Ids are deliberately not in the DOM — the screen must not be able to
      // answer a question about itself — so a row is matched by the two things
      // a PERSON reads it by: its subject and its address.
      const key = (r) => `${r.subject}|${r.addr ?? ""}`;
      const truthKey = (r) => `${r.subject}|${r.to_email}`;
      const drawn = rows.map(key);
      const want = TRUTH.map(truthKey);
      const firstDiff = drawn.findIndex((k, i) => k !== want[i]);
      ok(drawn.length === want.length && firstDiff === -1, "real/rows-match",
        `${tag}: the screen drew ${rows.length} row(s) and the table holds ${TRUTH.length}. `
        + `First difference at ${firstDiff}: drawn "${(drawn[firstDiff] ?? "(none)").slice(0, 90)}" against `
        + `"${(want[firstDiff] ?? "(none)").slice(0, 90)}". This is also the ORDER check — the table was read `
        + "with the same `sent_at desc, id desc` the screen asks for.");
      ok(rows.length > 0, "real/not-empty",
        `${tag}: zero rows drawn. This is a DISCOVERY FLOOR — the table holds ${TRUTH.length}, and a list that `
        + "finds nothing is a failure, never a pass.");
      const noAddr = rows.filter((r) => !r.addrBox || !r.addr);
      ok(noAddr.length === 0, "real/recipient",
        `${tag}: ${noAddr.length} of ${rows.length} row(s) drew no recipient. On a business-wide list the `
        + "address is the only thing that says whose mail a row is.");
      const at = (status) => rows.filter((r, i) => TRUTH[i]?.status === status);
      const dl = at("delivered"), bn = at("bounced");
      const bnWant = TRUTH.filter((t) => t.status === "bounced");
      ok(dl.length > 0 && dl.every((r) => r.word === WORDS.delivered && !r.red && r.marks >= 1),
        "real/delivered-green",
        `${tag}: ${dl.length} delivered row(s) read ${JSON.stringify(dl.map((r) => [r.word, r.red, r.marks]))}; `
        + `each must read "${WORDS.delivered}", not red, with a tick beside it.`);
      ok(bn.length > 0 && bn.every((r) => r.word === "Bounced" && r.red), "real/bounced-red",
        `${tag}: ${bn.length} bounced row(s) read ${JSON.stringify(bn.map((r) => [r.word, r.red]))}; a bad `
        + "outcome is the word PLUS the fixed --bad red, never the colour alone.");
      ok(bn.length > 0 && bn.every((r, i) => !!bnWant[i]?.detail && r.line.includes(bnWant[i].detail)),
        "real/bounced-reason",
        `${tag}: a bounced row's line reads "${(bn[0]?.line ?? "").slice(0, 120)}" and the table stores `
        + `"${(bnWant[0]?.detail ?? "").slice(0, 80)}". The provider's own words are the sentence that tells a `
        + "detailer what to do next.");
      const body = await text();
      ok(TRUTH.length >= CAP || !/most recent/i.test(body), "real/no-cap-line",
        `${tag}: ${rows.length} row(s) drawn and the screen says `
        + `"${(body.match(/[^\n]*most recent[^\n]*/i) || [""])[0]}" — the "n most recent" line may only appear `
        + `at ${CAP} rows, or it claims a limit that never applied.`);
      const foreign = foreignRows(drawn, new Set(want));
      ok(foreign.length === 0, "real/scope",
        `${tag}: ${foreign.length} row(s) on this detailer's list are not among their own business's rows — `
        + `${foreign.slice(0, 2).map((f) => f.slice(0, 70)).join("  /  ")}. The table holds rows for twelve `
        + "businesses and this policy is the only thing keeping them apart.");
      const sw = await HIT("[data-mail-log] .segmented button");
      ok(sw.length === 2 && sw.every((b) => b.h >= 44), "tap/switch-44",
        `${tag}: the Everything / Problems switch presses as ${JSON.stringify(sw)} — 44px of real hit area is `
        + "an absolute, and this is the only control on the screen.");

      // ── THE PROBLEMS FILTER, still real ────────────────────────────────────
      lastAsked = null;
      await clickProblems();
      await doneLoading();
      await settle();
      await sabotagePage("problems");
      const badRows = await readRows();
      await shoot(`${tag}-real-problems.png`);
      const gotBad = badRows.map(key);
      const wantBad = TRUTH_BAD.map(truthKey);
      const badDiff = gotBad.findIndex((k, i) => k !== wantBad[i]);
      ok(gotBad.length === wantBad.length && badDiff === -1, "real/problems-only-bad",
        `${tag}: Problems drew ${badRows.length} row(s); the table holds ${TRUTH_BAD.length} in the five states `
        + `that need a person. First difference at ${badDiff}. Asked: `
        + `${decodeURIComponent(String(lastAsked)).split("?")[1]?.slice(0, 200)}`);

      // ── TARGET B · THE FIXTURE LIST, for the two questions real rows cannot
      //    ask: the sent/delivered word pair, and a long address. ─────────────
      MODE = "fixture";
      await reopen();
      await doneLoading();
      await settle();
      if ((await readRows()).length === 0) {
        failures.push(`${tag} — the fixture list did not render, so five questions went unasked.`);
        assertions += 5;
      } else {
        await sabotagePage("fixture");
        const f = await readRows();
        const pick = (t) => f.find((r) => r.subject.startsWith(t));
        const fd = pick("zz-delivered"), fs = pick("zz-sent"), fl = pick("zz-long");
        await shoot(`${tag}-fixture.png`);
        ok(wordsDiffer(fd, fs), "fix/words-differ",
          `${tag}: the delivered row reads "${fd?.word}" and the merely-sent row reads "${fs?.word}". 3.1's own `
          + "done-when is that the two are visibly different.");
        ok(fd?.word === WORDS.delivered && fs?.word === WORDS.sent, "fix/words-exact",
          `${tag}: the words are "${fd?.word}" / "${fs?.word}"; the client record and the job record say `
          + `"${WORDS.delivered}" / "${WORDS.sent}" — a second vocabulary for one column is how two screens `
          + "come to disagree about whether an email bounced.");
        const fNoAddr = f.filter((r) => !r.addrBox || !r.addr);
        ok(f.length === FIX.length && fNoAddr.length === 0, "fix/addr-every-row",
          `${tag}: ${f.length} of ${FIX.length} fixture row(s) drew, ${fNoAddr.length} of them with no recipient.`);
        ok(!addrClipped(fl), "fix/addr-unclipped",
          `${tag}: the ${LONG_ADDR.length}-character address measured ${fl?.addrScrollW}px wide inside a `
          + `${fl?.addrClientW}px box. \`.row-item .sub\` clips with an ellipsis and clipped text has a perfectly `
          + "normal box, so an address cut to \"jordan.mcall…\" names nobody and nothing else here can see it.");
        const fit = await pageFit();
        ok(fit.sw <= fit.iw && f.every((r) => r.left >= -0.5 && r.right <= fit.iw + 0.5)
          && f.every((r) => r.painted), "fix/fit",
          `${tag}: scrollWidth ${fit.sw} against a ${fit.iw}px window; `
          + `${f.filter((r) => r.right > fit.iw + 0.5).length} row(s) past the edge; `
          + `${f.filter((r) => !r.painted).length} unpainted.`);
      }

      // ── THE STATES ─────────────────────────────────────────────────────────
      MODE = "empty";
      await reopen();
      await doneLoading();
      await settle();
      const e1 = await text();
      await clickProblems();
      await doneLoading();
      await settle();
      const e2 = await text();
      await shoot(`${tag}-empty.png`);
      ok(EMPTY_ALL.test(e1), "empty/everything",
        `${tag}: an empty answer under Everything reads "${e1.replace(/\s+/g, " ").slice(0, 160)}".`);
      ok(EMPTY_BAD.test(e2) && !EMPTY_ALL.test(e2), "empty/problems",
        `${tag}: an empty answer under Problems reads "${e2.replace(/\s+/g, " ").slice(0, 160)}" — it must not `
        + "claim nothing was ever sent, because it was only asked about the bad ones.");

      MODE = "fail";
      await reopen();
      await doneLoading();
      if (BREAK === "failempty") {
        const n = await page.evaluate(() => {
          const box = document.querySelector("[data-mail-log] .error-box");
          if (!box) return 0;
          const p = document.createElement("p");
          p.className = "quiet";
          p.textContent = "No email has been sent yet.";
          box.replaceWith(p);
          return 1;
        });
        sabotage.push(`failempty @${tag}: ${n} error box replaced with the empty sentence`);
      }
      await settle();
      const fTxt = await text();
      const fRows = (await readRows()).length;
      const retry = (await HIT("[data-mail-log] .btnrow button")).find((x) => /try again/i.test(x.text)) ?? null;
      await shoot(`${tag}-failed.png`);
      ok(!EMPTY_ALL.test(fTxt) && !EMPTY_BAD.test(fTxt) && fRows === 0
        && /could not read your sent email/i.test(fTxt), "failed/not-empty",
        `${tag}: a 500 from the database left the screen reading "${fTxt.replace(/\s+/g, " ").slice(0, 160)}" `
        + `with ${fRows} row(s). A failed read must never be drawn as "no email has been sent yet" — that is `
        + "the product stating in a full sentence the one thing 3.1 exists to stop it getting wrong.");
      ok(!!retry && retry.h >= 44, "failed/retry-44",
        `${tag}: Try again presses as ${JSON.stringify(retry)}. A dead end needs a way out and 44px of real `
        + "hit area is an absolute.");

      MODE = "slow";
      await reopen();
      // **`state: "attached"` IS LOAD-BEARING AND COST A RED RUN AT ALL FIVE
      // WIDTHS.** `waitForSelector` defaults to `state: "visible"`, and
      // Playwright's "visible" means a non-empty bounding box — but the element
      // that proves we are still waiting is `.rows[aria-busy=true]`, which is
      // EMPTY by definition, so it has zero height and is invisible exactly
      // while it is true. The default read as *the screen never showed a
      // loading state* on a screen that showed one for 1.8 seconds.
      const lBusy = await page.waitForSelector('[data-mail-log] .rows[aria-busy="true"]',
        { state: "attached", timeout: 10000 }).then(() => true).catch(() => false);
      const lTxt = await text();
      await shoot(`${tag}-loading.png`);
      ok(lBusy && !EMPTY_ALL.test(lTxt) && !EMPTY_BAD.test(lTxt), "loading/not-empty",
        `${tag}: while the answer is on its way the list is ${lBusy ? "" : "NOT "}marked busy and reads `
        + `"${lTxt.replace(/\s+/g, " ").slice(0, 140)}". Not knowing yet must not read as having nothing.`);
      await doneLoading();
    }

    // ── THE THREE CANARIES, through the real rules ────────────────────────────
    {
      const sent = { word: WORDS.sent };
      const says = wordsDiffer({ word: WORDS.sent }, sent);
      canaries.push(`the-same-word: a delivered row overwritten with "${WORDS.sent}" — comparator says `
        + `${says ? "DIFFERENT" : "SAME"}`);
      assertions++;
      if (says) {
        missed.push("CANARY MISSED: the-same-word — two rows reading the same word were reported DIFFERENT. "
          + "The comparator is not reading the words.");
      }

      const clipped = { addrBox: true, addrScrollW: 480, addrClientW: 246 };
      canaries.push(`the-clipped-address: a 480px address in a 246px box — rule says `
        + `${addrClipped(clipped) ? "CLIPPED" : "FITS"}`);
      assertions++;
      if (!addrClipped(clipped)) {
        missed.push("CANARY MISSED: the-clipped-address — an overflowing address passed the fit rule, so the "
          + "rule is satisfied by every short address and tests nothing.");
      }

      const alien = foreignRows(["a row this business does not hold"], new Set(["a", "b"]));
      canaries.push(`the-foreign-row: a row the business does not hold — rule says `
        + `${alien.length ? "FLAGGED" : "PASSED"}`);
      assertions++;
      if (!alien.length) {
        missed.push("CANARY MISSED: the-foreign-row — a row from another business passed the scope rule, so "
          + "the rule is satisfied by an empty list.");
      }
    }
  } finally {
    try { await page?.unrouteAll({ behavior: "ignoreErrors" }); } catch { /* closing anyway */ }
    try { await browser.close(); } catch { /* closing anyway */ }
  }

  // ── The count is declared and asserted as an EQUALITY — gotchas 98. ────────
  if (assertions !== EXPECTED_ASSERTIONS) {
    failures.push(`assertion count — ran ${assertions} against a declared ${EXPECTED_ASSERTIONS}; a question `
      + "was added or dropped without the declaration moving.");
  }
  if (BREAK && sabotage.length === 0) {
    failures.push(`sabotage \`--break=${BREAK}\` NEVER LANDED — nothing was edited, so this run is an ordinary `
      + "clean run wearing a sabotage's name (docs/gotchas.md 102). Do not read its colour either way.");
  }

  const FORGIVEN = /React Router Future Flag Warning/;
  // THE 500 THE `fail` MODE ASKS FOR. The browser logs every non-2xx fetch, and
  // that is the state under test rather than a defect; anything else still is.
  const REFUSAL = /Failed to load resource: the server responded with a status of 500/;
  const uniq = [...new Set(consoleBad)];
  const forgiven = uniq.filter((c) => FORGIVEN.test(c));
  const refusals = uniq.filter((c) => REFUSAL.test(c));
  for (const c of uniq.filter((c) => !FORGIVEN.test(c) && !REFUSAL.test(c))) failures.push(`console — ${c}`);
  if (forgiven.length) {
    observed.push(`console: ${forgiven.length} React Router future-flag warning(s) FORGIVEN BY NAME — `
      + "dev-only router setup");
  }
  if (refusals.length) {
    observed.push(`console: ${refusals.length} browser log line(s) for the 500 this check asks for, `
      + "FORGIVEN BY NAME");
  }

  const targets = SIZES.length * 5;   // real, problems, fixture, empty+failed, loading
  const { path, receipt } = writeReceipt({
    check_id: "mail-log",
    started_at: new Date(Date.now() - process.uptime() * 1000).toISOString(),
    status: failures.length || missed.length ? "fail" : "pass",
    expected_targets: targets,
    discovered_targets: targets,
    attempted_targets: targets,
    completed_targets: targets,
    skipped_targets: 0,
    assertions_executed: assertions,
    min_assertions: EXPECTED_ASSERTIONS,
    assertion_floor:
      "5 widths x 20 (8 real list, 1 switch, 1 problems filter, 5 fixture list, 5 states) + 3 canaries = 103. "
      + "Structural: fixed by the question list, never by what the run finds, and asserted as an EQUALITY.",
    failures: [...failures, ...missed],
    warnings: [
      "TARGET A IS REAL AND UN-REWRITTEN: the browser's own PostgREST read of `email_sends` under the demo "
      + `owner's session, compared in order against an independent service-role read of the same table `
      + `(${TRUTH.length} rows, ${TRUTH_BAD.length} of them bad). Nothing is written anywhere.`,
      "TARGET B IS FIXTURES, fulfilled inside the browser, and it exists for two questions real data cannot "
      + "ask: `demo-detail` has no `sent` row (3.1's done-when needs one beside a `delivered`) and no long "
      + "address (the `.sub.addr` rule exists because a long address clips at 320).",
      "It measures THE DETAILER'S SCREEN ONLY. It says nothing about `/admin`, which reads the same table "
      + "through `platform-admin` under the service role — `scripts/email-list-admin.mjs` is that walk.",
      "A booking link is not in scope: this screen draws none, because `/admin/job/:id` is not a route and "
      + "`/job/:id` is the detailer's own screen. 3.1's booking link is still Andrew's call.",
      "The six --break= sabotages are applied to the LIVE page or to the request on the wire, never to a "
      + "source file, and each one reports whether it actually landed (docs/gotchas.md 102).",
      "The real-row figures move as `demo-detail`'s own rows move; they are read fresh every run rather than "
      + "written into the floor.",
    ],
    artifacts: SIZES.flatMap((s) => ["real", "real-problems", "fixture", "empty", "failed", "loading"]
      .map((n) => `artifacts/mail-log/${s.w}x${s.h}-${n}.png`)),
    dimensions: {
      sizes: SIZES.map((s) => `${s.w}x${s.h}`),
      business: "demo-detail",
      real_rows: TRUTH.length,
      real_bad_rows: TRUTH_BAD.length,
      real_status_tally: tally,
      observed, canaries, sabotage: BREAK, sabotage_landed: sabotage,
      console_errors_and_warnings: uniq.slice(0, 10),
      console_forgiven_by_name: [...forgiven, ...refusals],
    },
    canary: {
      id: "the-clipped-address",
      observed_failure: missed.length === 0,
      problems: missed,
    },
  });

  for (const line of observed) console.log("  " + line);
  for (const c of canaries) console.log("  canary " + c);
  for (const s of sabotage) console.log("  sabotage " + s);
  console.log("");
  const badCount = failures.length + missed.length;
  if (badCount) {
    console.log(`FAIL  mail-log — ${badCount} finding(s)`);
    for (const f of [...failures, ...missed]) console.log("  · " + f);
  } else {
    console.log(`PASS  mail-log — ${receipt.completed_targets} targets, ${receipt.assertions_executed} `
      + "assertions, all three canaries caught");
  }
  console.log("receipt: " + path.replace(REPO + "\\", "").replace(REPO + "/", ""));
  process.exit(badCount ? 1 : 0);
}

run().catch((e) => {
  console.error("mail-log could not run: " + e.message);
  console.error("NOTHING WAS MEASURED. This is not a pass.");
  process.exit(2);
});
