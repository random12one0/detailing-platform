// STUDIO S5, "talk to it": the interpreter, its jobs queue and the hard rule (STUDIO-SPEC.md §7 row S5).
//   - the 20 scripted requests (test-fixtures/studio-ai-requests.json) give valid cards, or the dashboard place;
//   - "make it $10 cheaper" goes to the dashboard and never to the AI;
//   - a typed price in an AI-proposed wording is refused by the platform's validator, and no card is made of it;
//   - an AI answer that is malformed, or touches a binding, is rejected whole;
//   - a job outlives a page reload and a Control Room restart, waits when Claude is out of usage, can be stopped.
// The AI answers are REAL replies, recorded once (tools/studio-ai-record.mjs), and replayed by a stand-in CLI
// (test-fixtures/studio-fake-claude.mjs) through the real spawn, so these tests spend no usage.
//   node --test studio-ai.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { factRoute, readReply, loadPack, schemaArg, buildPrompt, PLACES, REPLY_SCHEMA, interpreterArgs, resolveClaude } from "./studio-ai.mjs";
import { createStudio, waitPhrase } from "./studio.mjs";
import { spawn } from "node:child_process";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = (process.env.SITE_ACCEPTANCE_PLATFORM || "C:/studio-work/s1").replace(/\\/g, "/");
const NEEDS = { skip: !(existsSync(path.join(PLAT, "scripts/studio/studio-check.mjs")) && existsSync(path.join(PLAT, "app/src/site/spec.js"))) && `needs the platform copy at ${PLAT}`, timeout: 240000 };
const REQUESTS = JSON.parse(readFileSync(path.join(HERE, "test-fixtures/studio-ai-requests.json"), "utf8")).requests;
const REPLIES = JSON.parse(readFileSync(path.join(HERE, "test-fixtures/studio-ai-replies.json"), "utf8")).replies;
const FAKE = path.join(HERE, "test-fixtures/studio-fake-claude.mjs");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(150); } throw new Error(`timed out waiting for ${what}`); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

// the example's spec and section types, as the platform copy has them (for the pure tests)
const SPEC = { schema: 1, pages: [{ path: "/", sections: [
  { id: "hero", type: "hero", copy: { eyebrow: "Neighborhood auto care", headline: "Care you can see.", sub: "Every price below comes from our booking system." }, photo: { bind: "gallery:1" }, cta: { bind: "book" } },
  { id: "menu", type: "catalog", copy: { title: "The menu" }, group: { bind: "service_group:2" } }] }] };
const TYPES = { hero: { copy: ["eyebrow", "headline", "sub"], slots: ["photo", "prices", "cta", "call", "area", "sale"] }, catalog: { copy: ["title", "intro"], slots: ["group", "add_ons", "plans", "sale"] } };
const J = (o) => JSON.stringify(o);

test("facts go to the dashboard before any AI; wording requests do not", () => {
  assert.deepEqual(factRoute("make it $10 cheaper"), [{ place: "Services & add-ons", what: "Prices" }]);
  for (const [t, place] of [["raise the price of the interior detail", "Services & add-ons"], ["We close at 5 on Saturdays now", "Hours & days off"], ["we're open on sundays now", "Hours & days off"],
    ["use a different photo up top", "Photo gallery"], ["add a ceramic package", "Services & add-ons"], ["remove that review", "Reviews"], ["start a winter sale", "Promo codes & sale"],
    ["change the phone number", "Business info"], ["add Oxnard to the towns", "Business info"], ["make the monthly plan cheaper", "Services & add-ons"], ["add a question about water", "FAQ"]])
    assert.ok(factRoute(t).some((r) => r.place === place), `${t} → ${place}: ${J(factRoute(t))}`);
  for (const t of ["Make the headline shorter.", "Make the whole site sound friendlier.", "Shorter", "Less salesy everywhere, please", "Move the reviews above the prices", "Make the book button bigger",
    "Put our prices in the headline, like from 85 dollars", "the title for the photos should be plainer"])
    assert.deepEqual(factRoute(t), [], t);
  for (const r of REQUESTS.filter((q) => q.expect === "route")) assert.equal(factRoute(r.text)[0]?.place, r.place, r.text);
  // REVIEW-S5 F4: the phrasings the regex used to miss
  for (const [t, place] of [["knock ten bucks off", "Services & add-ons"], ["charge 150 for the wash", "Services & add-ons"], ["the ceramic package is now 899", "Services & add-ons"],
    ["make it twenty dollars cheaper", "Services & add-ons"], ["we don't do Sundays anymore", "Hours & days off"], ["we're closed sundays now", "Hours & days off"], ["closed sundays", "Hours & days off"],
    ["get rid of that one-star review", "Reviews"], ["get rid of that photo", "Photo gallery"], ["we added ceramic coating", "Services & add-ons"], ["we stopped doing headlight restoration", "Services & add-ons"],
    ["we now serve Plano too", "Business info"], ["we take Venmo now", "How you get paid"], ["we accept cash and cards", "How you get paid"]])
    assert.ok(factRoute(t).some((r) => r.place === place), `${t} → ${place}: ${J(factRoute(t))}`);
  // and a request about the look is not a fact, even when it names the photos
  for (const t of ["Change the colour of the photos section", "make the reviews section smaller", "we come to you", "mention our 3-step process in the intro"]) assert.deepEqual(factRoute(t), [], t);
});

test("REVIEW-S5 F1, F2: the CLI starts with no shell and no permissions; the wait says how long and when", () => {
  const a = interpreterArgs({ model: "sonnet", effort: "medium", systemFile: "C:/x y/pack.md", session: "6f1c0b9e-2d7a-4c1e-9a77-1b2c3d4e5f60" });
  assert.ok(!a.includes("bypassPermissions") && !a.includes("--permission-mode"));
  assert.equal(a[a.indexOf("--tools") + 1], "", "an empty tool list, as a real empty argument (no shell quoting)");
  assert.equal(a[a.indexOf("--system-prompt-file") + 1], "C:/x y/pack.md", "a path with a space, unquoted: there is no shell");
  assert.ok(a.includes("--strict-mcp-config"));
  assert.deepEqual(resolveClaude(FAKE), { file: process.execPath, args: [FAKE] });
  assert.equal(resolveClaude("C:/nowhere/claude.cmd"), null, "a .cmd is never run through a shell");
  const real = resolveClaude("claude");
  if (real) assert.match(real.file, /\.exe$|claude$/i, "the real binary behind the npm shim");
  const at = new Date(2026, 10, 7, 3, 50).getTime();
  assert.equal(waitPhrase(at, at - 22 * 3600000), "about 22 hours (at 3:50 am Sat)");
  assert.equal(waitPhrase(at, at - 25 * 60000), "about 25 minutes (at 3:50 am)");
});

test("the knowledge pack: the interpreter's job first, then contract, conversion, copy, rubric and section library", () => {
  const p = loadPack(path.join(HERE, "studio/knowledge"));
  assert.deepEqual(p.files, ["interpreter.md", "contract.md", "conversion.md", "copy.md", "rubric.md", "section-library.md"]);
  assert.match(p.text, /Who's talking like this/); assert.match(p.text, /twelve things every site shows/i); assert.match(p.text, /M18/); assert.match(p.text, /Chase Detailing/);
  assert.match(p.hash, /^[0-9a-f]{12}$/);
  for (const place of PLACES) assert.ok(p.text.includes(`"${place}"`), `the pack names the dashboard place ${place}`);
  // the schema goes through cmd.exe as one argument: nothing in it that the shell would act on
  assert.deepEqual(JSON.parse(schemaArg()), REPLY_SCHEMA);
  const prompt = buildPrompt({ business: "Brightline", spec: SPEC, types: TYPES, target: { section: "hero", field: "headline" }, request: "Shorter  please" });
  assert.match(prompt, /REQUEST: Shorter please$/m); assert.match(prompt, /headline \(4 words now\): "Care you can see\."/); assert.match(prompt, /not changeable by a card: photo, cta/);
  assert.match(prompt, /wording field "headline"/);
});

test("an AI answer is read strictly: the wrong shape, a binding or an extra key is rejected whole", () => {
  const ok = readReply(J({ say: "Shorter.", cards: [{ section: "hero", field: "headline", to: "  Clean  cars. ", why: "short" }], dashboard: [{ place: "Reviews", what: "x" }, { place: "Nowhere", what: "y" }] }), SPEC, TYPES);
  assert.equal(ok.ok, true); assert.deepEqual(ok.cards, [{ section: "hero", field: "headline", to: "Clean cars.", why: "short" }]);
  assert.deepEqual(ok.dashboard, [{ place: "Reviews", what: "x" }], "an unknown dashboard place is dropped");
  const no = (raw, why) => { const r = readReply(raw, SPEC, TYPES); assert.equal(r.ok, false, raw); assert.equal(r.why, why, raw); assert.match(r.said, /nothing was made/); };
  no("Sure! Shorter it is.", "malformed");
  no(J({ say: "a", cards: [], dashboard: [] }) + " then " + J({ say: "b", cards: [], dashboard: [] }), "malformed");
  no(J({ say: "a", cards: "none", dashboard: [] }), "malformed");
  no(J({ say: "", cards: [], dashboard: [] }), "malformed");
  no(J({ say: "a", cards: [], dashboard: [], patch: {} }), "malformed");
  no(J({ say: "a", cards: [{ section: "gone", field: "title", to: "x", why: "" }], dashboard: [] }), "malformed");
  no(J({ say: "a", cards: [{ section: "hero", field: "photo", to: "a nicer one", why: "" }], dashboard: [] }), "binding");
  no(J({ say: "a", cards: [{ section: "menu", field: "group", to: "x", why: "" }], dashboard: [] }), "binding");
  no(J({ say: "a", cards: [{ section: "hero", field: "headline", to: "Clean.", why: "", bind: "book" }], dashboard: [] }), "binding");
  no(J({ say: "a", cards: [{ section: "hero", field: "headline", to: "Only service:302.price today", why: "" }], dashboard: [] }), "binding");
  no(J({ say: "see hours.week", cards: [], dashboard: [] }), "binding");
  // dropped, not rejected: a field the section has not got, and a second change for the same words
  const d = readReply(J({ say: "a", cards: [{ section: "menu", field: "intro", to: "New intro", why: "" }, { section: "hero", field: "sub", to: "A", why: "" }, { section: "hero", field: "sub", to: "B", why: "" }], dashboard: [] }), SPEC, TYPES);
  assert.equal(d.ok, true); assert.deepEqual(d.cards.map((c) => c.to), ["A"]); assert.equal(d.dropped.length, 2);
  // every recorded real reply is a real recording made with the pack as it is now
  const pack = loadPack(path.join(HERE, "studio/knowledge")).hash;
  for (const [k, v] of Object.entries(REPLIES)) if (!v.hand) assert.equal(v.recorded?.pack, pack, `"${k}" was recorded with this knowledge pack (re-record with tools/studio-ai-record.mjs after a pack change)`);
});

// ---------------------------------------------------------------- through the real Studio, the real spawn, the platform's validator
function studio(dir, settings = {}) {
  process.env.BELT_STUDIO_DATA = dir;
  process.env.STUDIO_CLAUDE_CMD = FAKE;
  writeFileSync(path.join(dir, "settings.json"), J({ allowed: PLAT, platform: PLAT, ...settings }));
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA; delete process.env.STUDIO_CLAUDE_CMD;
  S.call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  S.ask = (text, extra = {}) => S.call("POST", "/api/studio/ask", { site: "brightline", text, ...extra });
  S.job = (id) => S.store.job(id);
  S.settled = (id, ms = 60000) => until(() => { const j = S.store.job(id); return j && !["queued", "running"].includes(j.status) && j; }, ms, `job ${id}`);
  return S;
}
const withLog = (dir) => { const f = path.join(dir, "fake-calls.jsonl"); process.env.STUDIO_FAKE_LOG = f; return () => { try { return readFileSync(f, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } }; };

test("the 21 scripted requests (20 + the number-in-wording case): valid cards from recorded real replies, or the dashboard place with no AI call", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-ai-")), calls = withLog(dir);
  try {
    const S = studio(dir);
    assert.equal((await S.call("POST", "/api/studio/example")).ok, true);
    const tally = { cards: 0, route: 0, none: 0, nonumber: 0 };
    for (const q of REQUESTS) {
      const r = await S.ask(q.text, q.target ? { target: q.target } : {});
      assert.equal(r.ok, true, `${q.text}: ${r.said}`);
      const j = await S.settled(r.job);
      assert.equal(j.status, "done", `${q.text}: ${j.said}`);
      const cards = j.cards.map((k) => S.store.card("brightline", k));
      if (q.expect === "route") {
        assert.equal(j.kind, "route"); assert.equal(j.dashboard[0].place, q.place); assert.equal(cards.length, 0);
        assert.match(j.said, /kept in Brightline Auto Care's dashboard, so the site never has its own copy/);
        assert.doesNotMatch(j.said, /Business ›/, "the place is named once, in the box under it (REVIEW-S5 F3)");
        assert.ok(!calls().some((c) => c.prompt.includes(q.text)), `${q.text} never reaches the AI`);
      } else if (q.expect === "cards") {
        assert.ok(cards.length >= 1, `${q.text} gives at least one card: ${j.said} ${J(j.refused)}`);
        for (const c of cards) {
          assert.equal(c.status, "proposed"); assert.equal(c.base, 1); assert.equal(c.job, j.id); assert.equal(c.patch.op, "copy");
          assert.equal(c.source, q.target ? "tap" : "chat");
          assert.doesNotMatch(c.patch.to, /[\p{Nd}\p{Sc}%]/u, "no number reaches a card");
        }
        if (q.target) assert.ok(cards.every((c) => c.patch.section === q.target.section), "a tapped part's request changes that part");
        if (q.words) assert.equal(cards[0].patch.to, q.words, "his own words are used as he said them");
      } else if (q.expect === "nonumber") {
        // REVIEW-S5 F4: the same idea without the number (number words are refused too), and it says why
        for (const c of cards) assert.doesNotMatch(c.patch.to, /[\p{Nd}]|\b(?:three|two|four|five|ten)\b/iu);
        assert.equal(j.refused.length, 0, "nothing it proposed was refused");
        assert.match(j.said, /number/i, "it says why the number is not there");
      } else {
        assert.equal(cards.length, 0, `${q.text} gives no card: ${J(cards.map((c) => c.patch.to))}`);
        assert.ok(j.said.length > 10, "and says why");
      }
      tally[q.expect]++;
    }
    assert.deepEqual(tally, { cards: 12, route: 6, none: 2, nonumber: 1 }, "the mix of the 21");
    assert.equal(REQUESTS.length, 21);
    // what was sent: the pack as the system prompt, no tools, no session, the schema, the model from Studio settings
    const c = calls()[0];
    for (const a of ["--safe-mode", "--no-session-persistence", "--json-schema", "--system-prompt-file", "--session-id"]) assert.ok(c.args.includes(a), a);
    assert.equal(c.args[c.args.indexOf("--tools") + 1], "", "no tools at all");
    assert.equal(c.args[c.args.indexOf("--model") + 1], "sonnet"); assert.equal(c.args[c.args.indexOf("--effort") + 1], "medium");
    assert.match(c.system, /^# Your job: the Studio's change interpreter/); assert.match(c.system, /Copy rules/);
    assert.equal(calls().length, 15, "one AI call per request that is not a fact");
    // REVIEW-S5 F2: no permissions at all, no MCP, every built-in tool disallowed
    assert.ok(!c.args.includes("--permission-mode") && !c.args.includes("bypassPermissions") && !c.args.includes("--dangerously-skip-permissions"));
    for (const a of ["--strict-mcp-config", "--disallowed-tools", "Bash", "Write", "Edit"]) assert.ok(c.args.includes(a), a);
  } finally { delete process.env.STUDIO_FAKE_LOG; rmSync(dir, { recursive: true, force: true }); }
});

test("a typed price in AI wording is refused by the validator; malformed and binding answers make nothing", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-ai-"));
  try {
    const S = studio(dir);
    await S.call("POST", "/api/studio/example");
    const typed = await S.settled((await S.ask("Test: the headline with a typed price")).job);
    assert.equal(typed.status, "done"); assert.equal(typed.cards.length, 1, "the other card is still made");
    assert.equal(S.store.card("brightline", typed.cards[0]).patch.field, "title");
    assert.equal(typed.refused.length, 1); assert.equal(typed.refused[0].to, "Full detail from $185.");
    assert.match(typed.refused[0].said, /"\$185" is a price or a number typed into the wording/);
    for (const [t, why] of [["Test: the answer is not the shape", "malformed"], ["Test: two answers in one", "malformed"], ["Test: the answer changes the photo", "binding"],
      ["Test: the answer writes a dashboard link into the words", "binding"], ["Test: the answer adds a key a card does not have", "binding"]]) {
      const j = await S.settled((await S.ask(t)).job);
      assert.equal(j.status, "failed", t); assert.equal(j.rejected, why, t); assert.deepEqual(j.cards, []); assert.match(j.said, /nothing was made/);
    }
    assert.equal(S.store.cards("brightline").length, 1, "only the one good card exists");
    const crash = await S.settled((await S.ask("Test: the CLI crashes")).job);
    assert.equal(crash.status, "failed"); assert.match(crash.said, /something broke inside the CLI/);
    // asking again makes a new job on the latest revision
    const again = await S.call("POST", "/api/studio/ask/again", { id: crash.id });
    assert.equal(again.ok, true); assert.notEqual(again.job, crash.id);
    await S.settled(again.job);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("a job outlives a reload and a Control Room restart; busy and out-of-usage say so; a job can be stopped", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-ai-"));
  try {
    let S = studio(dir, { aiSeconds: 20 });
    await S.call("POST", "/api/studio/example");
    // busy: a second request waits its turn and is told so
    const slow = await S.ask("Test: a slow answer for the booking title");
    const second = await S.ask("Make the hours section title plainer");
    assert.match(second.said, /answering another request first; yours is next/);
    // a page reload (or a phone coming back over the tunnel) just reads the site again: the job is still there, running
    const seen = await until(async () => (await S.call("GET", "/api/studio/site?id=brightline")).ai.jobs.find((j) => j.id === slow.job && j.status === "running"), 10000, "running");
    assert.ok(seen.started_at); assert.equal(seen.session, undefined, "the page is not given process details");
    const pid = await until(() => S.job(slow.job).pid, 10000, "a pid");
    // the Control Room closes mid-job: its AI call stops with it, and the job still says running
    S.close();
    await sleep(800);
    assert.equal(S.job(slow.job).status, "running");
    // the next start puts it back in the queue and asks again; the answer arrives as a card
    S = studio(dir, { aiSeconds: 20 });
    await S.swept;
    const done = await S.settled(slow.job, 40000);
    assert.equal(done.status, "done", done.said); assert.match(done.note, /restarted while the AI was working on this/);
    assert.equal(S.store.card("brightline", done.cards[0]).patch.to, "Ask for a time");
    assert.equal(alive(pid), false, "the old call is not left running");
    assert.equal((await S.settled(second.job)).status, "done", "the one behind it ran too");
    // out of usage: it waits, says until when, and asks again by itself; it can be stopped
    const lim = await S.settled((await S.ask("Test: Claude is out of usage")).job);
    assert.equal(lim.status, "waiting"); assert.match(lim.said, /out of its usage limit\. This waits and asks again by itself in about \d+ (hours?|minutes?) \(at 11:40 pm( \w{3})?\)\./);
    assert.equal(new Date(lim.wait_until).getHours(), 23);
    // REVIEW-S5 F5: while it waits, a new request waits in line behind it and makes no call of its own
    const before = S.call("GET", "/api/studio/site?id=brightline");
    const behind = await S.ask("Make the hours section title plainer");
    assert.match(behind.said, /out of its usage limit\. Yours waits in line and is asked by itself in about/);
    await sleep(2500);
    assert.equal(S.job(behind.job).status, "queued", "no call is made while Claude is out");
    assert.equal(S.job(behind.job).session, undefined);
    await before;
    assert.equal((await S.call("POST", "/api/studio/ask/cancel", { id: lim.id })).ok, true);
    assert.equal(S.job(lim.id).status, "cancelled");
    assert.equal((await S.settled(behind.job)).status, "done", "once nothing waits, the line moves");
    // stopping a running job kills its call; nothing is made
    const long = await S.ask("Test: a very slow answer");
    const lp = await until(() => S.job(long.job).pid, 10000, "a pid");
    assert.equal((await S.call("POST", "/api/studio/ask/cancel", { id: long.job })).ok, true);
    assert.equal((await S.settled(long.job)).status, "cancelled");
    await sleep(800); assert.equal(alive(lp), false);
    // the time limit (20 s here): a call that does not answer is stopped and says so
    const late = await S.settled((await S.ask("Test: a very slow answer")).job, 40000);
    assert.equal(late.status, "failed"); assert.match(late.said, /took longer than 20 seconds and was stopped/);
    // plain refusals
    assert.match((await S.ask("   ")).said, /Say or type/);
    assert.match((await S.ask("x".repeat(1001))).said, /longer than 1000/);
    assert.match((await S.ask("Shorter", { target: { section: "gone" } })).said, /no longer on the site/);
    S.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("Studio settings: the AI model and effort are choices, checked", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-ai-"));
  try {
    const S = studio(dir);
    assert.equal(S.store.settings().aiModel, "sonnet"); assert.equal(S.store.settings().aiEffort, "medium");
    const bad = await S.call("POST", "/api/studio/settings", { values: { aiModel: "gpt-9" } });
    assert.equal(bad.ok, false); assert.equal(bad.key, "aiModel");
    const good = await S.call("POST", "/api/studio/settings", { values: { aiModel: "opus", aiEffort: "high", aiSeconds: 90 } });
    assert.equal(good.ok, true, good.said); assert.equal(good.settings.aiModel, "opus"); assert.equal(good.settings.aiEffort, "high");
    assert.equal((await S.call("POST", "/api/studio/settings", { values: { aiSeconds: 5 } })).key, "aiSeconds");
    S.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// REVIEW-S5 F1: a Control Room killed outright (no close, as Task Manager or the watchdog's hard stop does) leaves its
// Claude call running. The next start finds it by the job's session id, kills it, and asks again exactly once; a job
// that keeps meeting restarts is stopped after "Ask again after a restart, at most" tries; old finished chat is cleared.
test("REVIEW-S5 F1: after a hard kill the leftover call is found and stopped, the job is asked once more, retries are capped", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-ai-"));
  try {
    let S = studio(dir);
    await S.call("POST", "/api/studio/example");
    S.close();
    // a Control Room in its own process, asking for a slow answer
    const host = `import { createStudio } from ${J(new URL("./studio.mjs", import.meta.url).href)};
const S = createStudio({ HERE: ${J(HERE)}, json: (res, c, o) => res.done(o), body: (q, r, l, fn) => fn(q.body), onExit: false });
await S.swept;
const r = await new Promise((done) => S.handle({ method: "POST", body: { site: "brightline", text: "Test: a very slow answer" } }, { done }, new URL("http://x/api/studio/ask")));
const t = setInterval(() => { const j = S.store.job(r.job); if (j?.pid) { console.log(JSON.stringify({ job: r.job, pid: j.pid, session: j.session })); clearInterval(t); } }, 100);`;
    const child = spawn(process.execPath, ["--input-type=module", "-e", host], { windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, BELT_STUDIO_DATA: dir, STUDIO_CLAUDE_CMD: FAKE } });
    let out = ""; child.stdout.on("data", (d) => { out += d; });
    const said = await until(() => { try { return JSON.parse(out.trim().split("\n")[0]); } catch { return null; } }, 30000, "the host's call");
    assert.ok(alive(said.pid), "the call runs");
    spawnSync("taskkill", ["/F", "/PID", String(child.pid)], { windowsHide: true, stdio: "ignore" });   // the host only, NOT its tree
    await sleep(1000);
    // With no shell between them, the CLI is the Control Room's own child, and Windows ends it with the Control Room
    // (Node puts its children in a kill-on-close job). Before the fix, cmd.exe stood between, and the CLI lived on.
    assert.equal(alive(said.pid), false, "the call ended with the hard-killed Control Room");
    assert.equal(S.store.job(said.job).status, "running");
    // A leftover that did escape (started outside that job, holding the session id on its command line) is found
    // by the next start all the same, and stopped
    const orphan = spawn(process.execPath, ["-e", "setTimeout(() => {}, 120000)", "--", "--session-id", said.session], { windowsHide: true, detached: true, stdio: "ignore" });
    orphan.unref();
    await sleep(500);
    assert.equal(alive(orphan.pid), true);
    // the next start
    S = studio(dir);
    await S.swept;
    await sleep(800);
    assert.equal(alive(orphan.pid), false, "the leftover call was found by its session id and stopped");
    const again = await until(() => { const j = S.job(said.job); return j.status === "running" && j.session !== said.session && j; }, 20000, "asked again");
    assert.match(again.note, /restarted while the AI was working on this/);
    assert.equal(again.tries, 2);
    await S.call("POST", "/api/studio/ask/cancel", { id: said.job });
    await S.settled(said.job);
    S.close();
    // a job that has already met the cap: stopped, not asked a fourth time; and a finished request past "Keep the chat for" is cleared
    const capped = { ...S.store.job(said.job), id: "jcapped0001", status: "running", tries: 3, session: "00000000-0000-4000-8000-000000000000", pid: 999999 };
    S.store.saveJob(capped);
    const old = { id: "jold00000001", site: "brightline", request: "x", status: "done", created_at: "2025-01-01T00:00:00.000Z", finished_at: "2025-01-01T00:00:10.000Z", cards: [], dashboard: [], refused: [] };
    S.store.saveJob(old);
    S = studio(dir);
    await S.swept;
    assert.equal(S.store.job("jcapped0001").status, "failed");
    assert.match(S.store.job("jcapped0001").said, /restarted 3 times while the AI was answering this, so it was stopped/);
    assert.equal(S.store.job("jold00000001"), null, "finished requests older than the setting are cleared");
    S.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- engine choice (Claude / Codex / auto), fake CLIs, no usage
test("runAI: codex engine runs `codex exec` with the schema, pack in front of the prompt, Codex model; auto falls back from a missing Claude", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-engine-"));
  const log = path.join(dir, "log.jsonl"), fakeCodex = path.join(dir, "codex.js"), sys = path.join(dir, "pack.md");
  const reply = J({ say: "ok", cards: [], dashboard: [] });
  writeFileSync(sys, "THE PACK");
  // a stand-in for codex.js: records argv + stdin, writes the answer to --output-last-message
  writeFileSync(fakeCodex, `import fs from "node:fs"; const a = process.argv.slice(2); const p = fs.readFileSync(0, "utf8");
fs.appendFileSync(${J(log)}, JSON.stringify({ a, p, schema: fs.existsSync(a[a.indexOf("--output-schema") + 1]) }) + "\\n");
fs.writeFileSync(a[a.indexOf("--output-last-message") + 1], ${J(reply)});`);
  process.env.STUDIO_CODEX_CMD = fakeCodex;
  try {
    const { runAI, pickEngine } = await import("./studio-ai.mjs");
    const o = { model: "sonnet", codexModel: "gpt-6.1-sol", effort: "low", systemFile: sys, session: "6f1c0b9e-2d7a-4c1e-9a77-1b2c3d4e5f60", prompt: "REQUEST: x", ms: 20000, kill() {} };
    assert.equal(pickEngine("auto", FAKE), "claude"); assert.equal(pickEngine("auto", "C:/nowhere/claude.cmd"), "codex");
    assert.equal(pickEngine("codex", FAKE), "codex"); assert.equal(pickEngine("claude", "C:/nowhere/claude.cmd"), "claude");
    for (const [engine, cmd] of [["codex", FAKE], ["auto", "C:/nowhere/claude.cmd"]]) {
      const r = await runAI({ ...o, engine, cmd });
      assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(readReply(r.text, SPEC, TYPES).ok, true);
    }
    const calls = readFileSync(log, "utf8").trim().split("\n").map((l) => JSON.parse(l));
    assert.equal(calls.length, 2);
    for (const c of calls) {
      assert.equal(c.a[c.a.indexOf("-m") + 1], "gpt-6.1-sol", "the Codex model, not 'sonnet'");
      assert.ok(c.a.includes("model_reasoning_effort=low") && c.a.includes("--ephemeral") && c.schema);
      assert.equal(c.p, "THE PACK\n\n---\n\nREQUEST: x", "codex has no system-prompt flag: the pack goes first, every call");
    }
    // engine "claude" never touches codex
    await runAI({ ...o, engine: "claude", cmd: FAKE });
    assert.equal(readFileSync(log, "utf8").trim().split("\n").length, 2);
  } finally { delete process.env.STUDIO_CODEX_CMD; rmSync(dir, { recursive: true, force: true }); }
});
