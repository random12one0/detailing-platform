// ROADMAP 0.4 — PRESS "TELL THEM WORK HAS STARTED" FOR REAL, AGAINST THE LIVE SERVER.
//
//   ALLOW_REAL_MAIL=1 node scripts/build-start-live.mjs                  (dev server on :5173)
//   ALLOW_REAL_MAIL=1 node scripts/build-start-live.mjs --break=no-confirm   # sabotage: never answer the confirm
//   node scripts/receipt.mjs receipts/build-start-live.json
//
// The promise (/terms, /pricing): a detailer is TOLD on the day work on their
// site starts, and that day is RECORDED. One press must do both, a second
// press must be refused naming the date, and an address that cannot receive
// mail must not end up with a recorded date.
//
// WHAT IT TOUCHES, so a lane statement can name it:
//   * Project kguqylyzgyzfktkfnhjb only (refuses any other). Never the demo tenant.
//   * Three throwaway businesses (slug `build-start-live-*`, is_demo), deleted in `finally`.
//   * One throwaway platform admin (`scripts/admin-account.mjs`), deleted in `finally`.
//   * TWO REAL EMAILS to Resend's `delivered@resend.dev` simulator — the success
//     path IS a real send, so it cannot be proved without one. Opt-in per run.
//   * The deployed `platform-admin` and `send-email`. It deploys nothing.
//
// TARGETS (5): success at 1440, success at 392, stale-tab refusal at each width,
// and the unreachable address (asked over the wire; its verdict depends on which
// platform-admin is LIVE, and the receipt says which one answered).

import "../tests/_env.mjs";
import { createRequire } from "node:module";
import { writeReceipt } from "./receipt.mjs";
import { dropAdmin, makeAdmin } from "./admin-account.mjs";
import { realMail, sink } from "../tests/_mail.mjs";

const { chromium } = createRequire(import.meta.url)("../app/node_modules/playwright/index.js");
const URL_ = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
const PLATFORM = "kguqylyzgyzfktkfnhjb";
if (process.env.SUPABASE_PROJECT_REF !== PLATFORM || !URL_?.includes(`${PLATFORM}.supabase.co`)) {
  console.error(`Refusing: not ${PLATFORM}. Nothing was touched.`); process.exit(1);
}
const BASE = process.env.BASE || "http://localhost:5173";
const BREAK = (process.argv.find((a) => a.startsWith("--break=")) || "").slice(8);
const ADMIN_EMAIL = "build-start-live-admin@detailplatform.com"; // mail-sink: a login; autoconfirm is on, no mail
const REAL = realMail("delivered@resend.dev", "0.4's success path is a real send; one per width"); // mail-sink: declared real send
const H = { apikey: SERVICE, Authorization: `Bearer ${SERVICE}`, "Content-Type": "application/json", Prefer: "return=representation" };
const rest = async (method, p, body) => {
  const r = await fetch(`${URL_}/rest/v1/${p}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let data = null; try { data = JSON.parse(text); } catch {}
  return { status: r.status, data, text };
};

const started = new Date();
// The REST read says `+00:00`, the function says `Z`: same instant, different text.
const sameInstant = (a, b) => !!a && !!b && Date.parse(a) === Date.parse(b);
let assertions = 0;
const failures = [];
const check = (label, ok, detail = "") => {
  assertions++;
  if (!ok) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? `  (${detail})` : ""}`);
  return ok;
};
const dims = { break: BREAK || null, real_mail_sent: 0, targets: {} };
let completed = 0;
let canaryCaught = 0;
const FIX = [
  { key: "w1440", name: "BUILD START LIVE 1440", email: REAL },
  { key: "w392", name: "BUILD START LIVE 392", email: REAL },
  { key: "sink", name: "BUILD START LIVE SINK", email: sink("build-start-live") },
];
const biz = {};
let acct = null, browser = null;

try {
  console.log(`build-start, live — ${BASE}${BREAK ? `\n*** --break=${BREAK}: a sabotage, not a result ***` : ""}\n`);
  for (const f of FIX) {
    const slug = `build-start-live-${f.key}`;
    await rest("DELETE", `businesses?slug=eq.${slug}`);
    const made = await rest("POST", "businesses", [{ is_demo: true, slug, name: f.name, timezone: "America/Los_Angeles", contact_email: f.email }]);
    if (made.status !== 201) throw new Error(`fixture ${slug}: ${made.status} ${made.text}`);
    biz[f.key] = made.data[0];
  }
  acct = await makeAdmin(URL_, SERVICE, ADMIN_EMAIL);
  if (!acct) throw new Error("could not make the throwaway admin");

  browser = await chromium.launch();
  const signedIn = async (width, height) => {
    const ctx = await browser.newContext({ viewport: { width, height } });
    const page = await ctx.newPage();
    const consoleLines = [];
    page.on("console", (m) => { if (["error", "warning"].includes(m.type())) consoleLines.push(`${m.type()}: ${m.text()}`); });
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector("input[type=email]", { timeout: 25000 });
    await page.fill("input[type=email]", acct.email);
    await page.fill("input[type=password]", acct.password);
    await page.click("form button.pa-btn");
    await page.waitForSelector(".pa-tab", { timeout: 25000 });
    return { ctx, page, consoleLines };
  };
  const openDetailer = async (page, b) => {
    await page.locator(".pa-tab", { hasText: "Detailers" }).click();
    await page.fill('input[placeholder="Search a name, a link or an email"]', b.slug);
    await page.locator(".pa-biz", { hasText: b.name }).first().click();
    await page.waitForSelector(`.pa-open[aria-label="${b.name}"]`, { timeout: 20000 });
  };
  const buildRow = (page) => page.locator(".pa-open .pa-row", { hasText: "Build started" }).locator(".pa-v").innerText();
  const button = (page) => page.locator(".pa-open button", { hasText: "Tell them work has started" });
  const press = async (page) => {
    await button(page).click();
    if (BREAK !== "no-confirm") await page.locator(".pa-open button", { hasText: "Yes, email them today's date" }).click();
  };

  for (const [key, width, height] of [["w1440", 1440, 900], ["w392", 392, 844]]) {
    const b = biz[key];
    console.log(`\n${width}px — ${b.slug}`);
    const A = await signedIn(width, height);
    const B = await signedIn(width, height); // the stale tab: open BEFORE the press
    await openDetailer(A.page, b);
    await openDetailer(B.page, b);
    check(`${width}: row reads "not started" before the press`, (await buildRow(A.page)) === "not started", await buildRow(A.page));
    const box = await button(A.page).boundingBox();
    check(`${width}: the button is at least 44px tall`, (box?.height ?? 0) >= 44, `${box?.height}px`);

    const answer = A.page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin") && r.request().postData()?.includes("build_start"), { timeout: 30000 }).catch(() => null);
    await press(A.page);
    const res = await answer;
    const body = res ? await res.json().catch(() => null) : null;
    check(`${width}: the server answered success`, res?.status() === 200 && body?.success === true, `${res?.status()} ${JSON.stringify(body)?.slice(0, 120)}`);
    if (res?.status() === 200) dims.real_mail_sent++;
    await A.page.waitForFunction(() => {
      const r = [...document.querySelectorAll(".pa-open .pa-row")].find((x) => x.textContent.includes("Build started"));
      return r && !r.textContent.includes("not started");
    }, null, { timeout: 15000 }).catch(() => {});
    const shown = await buildRow(A.page);
    const db = (await rest("GET", `businesses?id=eq.${b.id}&select=site_build_started_at`)).data?.[0]?.site_build_started_at ?? null;
    const sends = (await rest("GET", `email_sends?business_id=eq.${b.id}&select=status,to_email,subject,sent_at`)).data ?? [];
    check(`${width}: the date is recorded`, sameInstant(db, body?.site_build_started_at), `db ${db}`);
    check(`${width}: the row now shows the day, not "not started"`, shown !== "not started" && /\w+day, \w+ \d+/.test(shown), shown);
    check(`${width}: the button is gone once it is done`, (await button(A.page).count()) === 0);
    check(`${width}: exactly one email row, sent to the contact email`, sends.length === 1 && ["sent", "delivered"].includes(sends[0].status) && sends[0].to_email === REAL, JSON.stringify(sends));
    // CANARY, IN THE RUN: the same "it is done" test, aimed at the stale tab,
    // which has NOT been redrawn and must still read "not started".
    const staleRow = await buildRow(B.page);
    if (!(staleRow !== "not started" && /w+day, w+ d+/.test(staleRow))) canaryCaught++;

    // THE STALE TAB. It still shows the button; the server must refuse and name the date.
    let alertText = null;
    B.page.once("dialog", async (d) => { alertText = d.message(); await d.accept(); });
    const answer2 = B.page.waitForResponse((r) => r.url().includes("/functions/v1/platform-admin") && r.request().postData()?.includes("build_start"), { timeout: 30000 }).catch(() => null);
    await press(B.page);
    const res2 = await answer2;
    const body2 = res2 ? await res2.json().catch(() => null) : null;
    await B.page.waitForTimeout(500);
    const db2 = (await rest("GET", `businesses?id=eq.${b.id}&select=site_build_started_at`)).data?.[0]?.site_build_started_at ?? null;
    const sends2 = (await rest("GET", `email_sends?business_id=eq.${b.id}&select=status`)).data ?? [];
    check(`${width}: a second press from a stale tab is refused (409) naming the recorded date`, res2?.status() === 409 && sameInstant(body2?.site_build_started_at, db), `${res2?.status()} ${JSON.stringify(body2)?.slice(0, 140)}`);
    check(`${width}: the refusal is shown to the person who pressed`, /already recorded as started/.test(alertText ?? ""), alertText ?? "no message shown");
    check(`${width}: the date did not move and no second email went`, db2 === db && sends2.length === 1, `db ${db2}, ${sends2.length} email row(s)`);
    check(`${width}: console clean (both tabs; the refusal's own 409 excepted)`,
      [...A.consoleLines, ...B.consoleLines].filter((l) => !/409|Failed to load resource/.test(l)).length === 0,
      [...A.consoleLines, ...B.consoleLines].join(" | ").slice(0, 300));
    dims.targets[key] = { recorded: db, shown, email_rows: sends.length, refusal_status: res2?.status() ?? null, console: [...A.consoleLines, ...B.consoleLines] };
    completed += 2;
    await A.ctx.close(); await B.ctx.close();
  }

  // THE UNREACHABLE ADDRESS, over the wire. Fixed in the checkout (0600782d);
  // which answer comes back depends on which platform-admin is LIVE.
  console.log(`\nunreachable address — ${biz.sink.slug}`);
  const tok = (await (await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email: acct.email, password: acct.password }) })).json()).access_token;
  const r = await fetch(`${URL_}/functions/v1/platform-admin`, { method: "POST",
    headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "build_start", business_id: biz.sink.id }) });
  const sb = await r.json().catch(() => null);
  const sdb = (await rest("GET", `businesses?id=eq.${biz.sink.id}&select=site_build_started_at`)).data?.[0]?.site_build_started_at ?? null;
  const ssends = (await rest("GET", `email_sends?business_id=eq.${biz.sink.id}&select=status,detail`)).data ?? [];
  const verdict = r.status === 502 && !sdb ? "FIXED" : (r.status === 200 && sdb ? "LIVE-UNFIXED" : "UNEXPECTED");
  console.log(`  answer ${r.status} ${JSON.stringify(sb).slice(0, 160)}; recorded ${sdb}; email rows ${JSON.stringify(ssends)}`);
  console.log(`  verdict: ${verdict}`);
  dims.targets.sink = { status: r.status, recorded: sdb, email_rows: ssends, verdict };
  // A KNOWN STATE, NOT A PASS: the live server stamping here is the defect the
  // checkout fixes and Andrew's publish removes. UNEXPECTED is the only red.
  check("unreachable address: the live answer is one of the two known states", verdict !== "UNEXPECTED", verdict);
  check("unreachable address: nothing was emailed", ssends.every((s) => !["sent", "delivered"].includes(s.status)), JSON.stringify(ssends));
  completed += 1;
} catch (e) {
  failures.push(`run stopped: ${e.message}`);
  console.error(e);
} finally {
  if (browser) await browser.close().catch(() => {});
  for (const f of FIX) await rest("DELETE", `businesses?slug=eq.build-start-live-${f.key}`).catch(() => {});
  if (acct) await dropAdmin(URL_, SERVICE, acct.id);
  const left = (await rest("GET", "businesses?slug=like.build-start-live-*&select=id")).data ?? [];
  console.log(`\nteardown: ${left.length} fixture business(es) left, admin dropped`);
}

// CANARY: the "row shows the day" test must FAIL on the stale tab at both
// widths, or a green "shows the day" proves nothing. --break=no-confirm is the
// separate sabotage: it never answers the confirm and the success checks must go red.
const canary = { id: "the done-test must fail on an unpressed (stale) tab at both widths", observed_failure: canaryCaught === 2, caught: canaryCaught };
const ok = failures.length === 0;
writeReceipt({
  check_id: "build-start-live",
  started_at: started.toISOString(),
  status: ok ? "pass" : "fail",
  expected_targets: 5, discovered_targets: 5, attempted_targets: 5, completed_targets: completed, skipped_targets: 0,
  assertions_executed: assertions, min_assertions: 20,
  failures, dimensions: dims,
  artifacts: ["scripts/build-start-live.mjs", "supabase/functions/platform-admin/index.ts", "app/src/admin/AdminPage.jsx"],
  warnings: [
    "Presses the DEPLOYED platform-admin; it cannot say which commit is live. The unreachable-address verdict names which behavior answered.",
    "Spends two real emails of the daily allowance per clean run (the REAL address above).",
    "Overlapping presses (ROADMAP 0.4g) are NOT exercised: the stale tab presses after the first press finished.",
  ],
  canary,
});
console.log(`\n${ok ? "PASS" : "FAIL"} — ${assertions} assertions, ${failures.length} failed; ${completed} of 5 targets.`);
process.exit(ok ? 0 : 1);
