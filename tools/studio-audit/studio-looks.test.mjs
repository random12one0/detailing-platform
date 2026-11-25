// STUDIO S6, three looks and the critic (STUDIO-SPEC.md §4c, §4e, §7 row S6). The proofs:
//   - three looks fail the distinctness check when two share a hero layout (or a type pairing, or a section order);
//   - a look that fails a hard gate is hidden until a version passes (real gates, real renderer);
//   - the critic's answer is read strictly: a malformed one is refused and nothing is scored;
//   - Love it / No is kept in the site's taste log and survives a restart;
//   - nothing a maker writes can change a binding (pure, and through the Studio, and in the revision "Use this look"
//     makes).
// The makers' and the critic's answers are REAL ones, recorded by tools/studio-looks-run.mjs
// (test-fixtures/studio-looks-replies.json) and replayed by the stand-in CLIs (studio-fake-claude.mjs,
// studio-fake-codex.mjs), so the suite spends no usage. The few hand-made answers say so (marked hand: true).
//   node --test studio-looks.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readLook, assembleLook, bindingSet, distinctness, criticSummary, lookSchema, buildLookPrompt, gateRows, gatesPass } from "./studio-looks.mjs";
import { validateCritic, rubric } from "./site-score.mjs";
import { runCritics } from "./site-critic.mjs";
import { spawn, spawnSync } from "node:child_process";
import { createStudio, openStore } from "./studio.mjs";
import { platformCopy } from "./test-fixtures/platform-copy.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PLAT = platformCopy();
const HAS_FAMILIES = existsSync(path.join(PLAT, "app/src/site/families.js")) && existsSync(path.join(PLAT, "scripts/studio/example-engine.mjs"));
const NEEDS = { skip: !HAS_FAMILIES && `needs the platform copy with the S6 renderer at ${PLAT}`, timeout: 420000 };
const REC = JSON.parse(readFileSync(path.join(HERE, "test-fixtures/studio-looks-replies.json"), "utf8"));
const FAKE_CLAUDE = path.join(HERE, "test-fixtures/studio-fake-claude.mjs"), FAKE_CODEX = path.join(HERE, "test-fixtures/studio-fake-codex.mjs");
const J = (o) => JSON.stringify(o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (fn, ms, what) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(300); } throw new Error(`timed out waiting for ${what}`); };

// the example's sections and types as the platform copy has them
const TYPES = { hero: { copy: ["eyebrow", "headline", "sub"], required: ["headline"], slots: ["photo", "prices", "cta", "call", "area", "sale"] },
  catalog: { copy: ["title", "intro"], required: ["title"], slots: ["group", "add_ons", "plans", "sale"] }, proof: { copy: ["title", "intro"], required: ["title"], slots: ["gallery", "reviews"] },
  visit: { copy: ["title", "intro"], required: ["title"], slots: ["hours", "area", "contact", "faq", "pay"] }, booking: { copy: ["title", "intro"], required: ["title"], slots: ["book"] } };
const BASE = { schema: 1, slug: "example_brightline", tokens: { font_display: "Newsreader", font_body: "Chivo", paper: "#0f2a2b", ink: "#efece4", accent: "#ef5a3c" }, pages: [{ path: "/", sections: [
  { id: "hero", type: "hero", variant: "poster", copy: { headline: "Care you can see." }, photo: { bind: "gallery:801" }, prices: { bind: "service_group:201" }, cta: { bind: "book" }, call: { bind: "contact.phone" } },
  { id: "menu", type: "catalog", variant: "ticket", copy: { title: "The menu" }, group: { bind: "service_group:201" }, add_ons: { bind: "add_ons" } },
  { id: "work", type: "proof", variant: "wipe", copy: { title: "The work" }, gallery: { bind: "gallery.best(1)" }, reviews: { bind: "reviews.top(3)" } },
  { id: "visit", type: "visit", variant: "board", copy: { title: "Visit" }, hours: { bind: "hours.week" }, faq: { bind: "faq" } },
  { id: "book", type: "booking", variant: "inline", copy: { title: "Request a time" }, book: { bind: "book" } }] }] };
const FAM = (key, hero, font_display, font_body) => ({ key, name: key, hero, line: "", order: [], tokens: { family: key, font_display, font_body, paper: "#ffffff", ink: "#111111", accent: "#2350d8" } });
const ANSWER = (order, head = "Clean cars. No fuss.") => ({ why: ["One.", "Two.", "Three."], order, copy: { hero: { eyebrow: "", headline: head, sub: "" }, catalog: { title: "What it costs", intro: "" },
  proof: { title: "Before and after", intro: "Illustrations, not real work." }, visit: { title: "When we can come", intro: "" }, booking: { title: "Request a time", intro: "" } } });

test("nothing a maker writes can change a binding: a look holds exactly its revision's bindings", () => {
  const r = readLook(J(ANSWER(["hero", "proof", "catalog", "booking", "visit"])), BASE, TYPES);
  assert.equal(r.ok, true, r.said);
  const spec = assembleLook(BASE, FAM("showroom", "overlay", "Big Shoulders Display", "Figtree"), r);
  assert.deepEqual(bindingSet(spec), bindingSet(BASE));
  assert.deepEqual(spec.pages[0].sections.map((s) => s.type), ["hero", "proof", "catalog", "booking", "visit"]);
  assert.equal(spec.pages[0].sections[0].variant, "overlay");
  assert.equal(spec.tokens.family, "showroom");
  // a maker cannot write one at all: an answer that holds a binding address, or any key a look does not have, is refused whole
  for (const bad of [
    { ...ANSWER(["hero", "proof", "catalog", "booking", "visit"]), copy: { ...ANSWER([]).copy, hero: { eyebrow: "", headline: "From service:302.price", sub: "" } } },
    { ...ANSWER(["hero", "proof", "catalog", "booking", "visit"]), copy: { ...ANSWER([]).copy, catalog: { title: "Menu", intro: "", group: "service_group:999" } } },
    { ...ANSWER(["hero", "proof", "catalog", "booking", "visit"]), tokens: { accent: "#ff0000" } },
    { ...ANSWER(["hero", "proof", "catalog", "booking", "visit"]), copy: { ...ANSWER([]).copy, hero: { eyebrow: "", headline: '{"bind":"hours.week"}', sub: "" } } },
  ]) assert.equal(readLook(J(bad), BASE, TYPES).ok, false, J(bad).slice(0, 120));
});

test("the maker's answer is read strictly: shape, order, required words", () => {
  const no = (raw, why) => { const r = readLook(raw, BASE, TYPES); assert.equal(r.ok, false, why); assert.match(r.said, /nothing was made/); };
  no("not json", "not JSON");
  no(J({ why: ["a", "b"], order: ANSWER([]).order, copy: ANSWER([]).copy }), "two reasons");
  no(J(ANSWER(["proof", "hero", "catalog", "booking", "visit"])), "hero not first");
  no(J(ANSWER(["hero", "proof", "catalog", "booking"])), "a section missing");
  no(J(ANSWER(["hero", "proof", "catalog", "booking", "visit", "visit"])), "a section twice");
  no(J({ ...ANSWER(["hero", "proof", "catalog", "booking", "visit"]), copy: { ...ANSWER([]).copy, booking: { title: "", intro: "" } } }), "a required title left empty");
  no(J({ ...ANSWER(["hero", "proof", "catalog", "booking", "visit"]), copy: { ...ANSWER([]).copy, hero: { headline: "x".repeat(401) } } }), "too long");
  // the schema the CLI is given names exactly these fields
  const sch = lookSchema(BASE, TYPES);
  assert.deepEqual(Object.keys(sch.properties.copy.properties).sort(), ["booking", "catalog", "hero", "proof", "visit"]);
  assert.deepEqual(sch.properties.copy.properties.hero.required, ["eyebrow", "headline", "sub"]);
  // the request tells the maker the orders the other looks use, and the fixes on a remake
  const p = buildLookPrompt({ business: "B", letter: "B", family: FAM("neighbourhood", "stack", "Changa One", "Figtree"), baseSpec: BASE, types: TYPES,
    others: [{ letter: "A", name: "Showroom", order: ["hero", "proof", "catalog", "visit", "booking"] }], fixes: ["Spacing: too tight"], round: 2 });
  assert.match(p, /look A \(Showroom\): hero, proof, catalog, visit, booking/);
  assert.match(p, /THIS IS A REMAKE \(round 2\)[\s\S]*Spacing: too tight/);
  assert.match(p, /^REQUEST: Make look B in the neighbourhood family \(round 2\)$/m);
});

test("three looks fail the distinctness check when two share a hero layout, a type pairing or a section order", () => {
  const ans = (o) => readLook(J(ANSWER(o)), BASE, TYPES);
  const A = assembleLook(BASE, FAM("showroom", "overlay", "Big Shoulders Display", "Figtree"), ans(["hero", "proof", "catalog", "visit", "booking"]));
  const B = assembleLook(BASE, FAM("neighbourhood", "stack", "Changa One", "Figtree"), ans(["hero", "proof", "catalog", "booking", "visit"]));
  const C = assembleLook(BASE, FAM("workshop", "ledger", "Barlow Condensed", "Source Sans 3"), ans(["hero", "proof", "booking", "catalog", "visit"]));
  assert.deepEqual(distinctness([{ letter: "A", spec: A }, { letter: "B", spec: B }, { letter: "C", spec: C }]), [], "three different looks pass");
  // C with A's hero layout
  const sameHero = assembleLook(BASE, FAM("workshop", "overlay", "Barlow Condensed", "Source Sans 3"), ans(["hero", "proof", "booking", "catalog", "visit"]));
  const h = distinctness([{ letter: "A", spec: A }, { letter: "B", spec: B }, { letter: "C", spec: sameHero }]);
  assert.equal(h.length, 1); assert.equal(h[0].letter, "C"); assert.equal(h[0].with, "A"); assert.match(h[0].what.join(), /same first-screen layout \(overlay\)/);
  // C with B's type pairing
  const samePair = assembleLook(BASE, FAM("workshop", "ledger", "Changa One", "Figtree"), ans(["hero", "proof", "booking", "catalog", "visit"]));
  assert.match(distinctness([{ letter: "A", spec: A }, { letter: "B", spec: B }, { letter: "C", spec: samePair }])[0].what.join(), /same type pairing \(Changa One \+ Figtree\)/);
  // C with A's section order
  const sameOrder = assembleLook(BASE, FAM("workshop", "ledger", "Barlow Condensed", "Source Sans 3"), ans(["hero", "proof", "catalog", "visit", "booking"]));
  assert.match(distinctness([{ letter: "A", spec: A }, { letter: "B", spec: B }, { letter: "C", spec: sameOrder }])[0].what.join(), /same section order/);
});

test("the critic's answer is read strictly; the real recorded answers are scored", () => {
  assert.ok(REC.critics.length >= 3, "real critic answers are recorded");
  for (const c of REC.critics) {
    const s = criticSummary(c.answer);
    assert.ok(s.score >= 0 && s.score <= 100 && s.pay.length === 12 && s.fixes.length <= 3);
    assert.equal(s.pass, s.passes >= 10 && !s.critical.length && s.score >= 80);
  }
  const good = REC.critics[0].answer;
  const bad = [
    "not json",
    { ...good, extra: 1 },
    { ...good, pay: { ...good.pay, Q3: { answer: "maybe", evidence: "x" } } },
    { ...good, pay: { ...good.pay, Q4: { answer: "yes", evidence: " " } } },
    { ...good, items: { ...good.items, design: { ...good.items.design, type: undefined } } },
    { items: good.items },
  ];
  for (const b of bad) assert.throws(() => criticSummary(b), /Malformed|Missing|JSON|Unexpected/, J(b).slice(0, 80));
  // a critic answer is the same contract the full grade uses
  assert.doesNotThrow(() => validateCritic(good));
});

test("gate rows: G4 is never a pass here, and one failure hides the look", () => {
  const ok = { pass: true, measures: {}, failures: [] };
  const rows = gateRows({ ok: true, gates: { G0: ok, G1: ok, G2: ok, G3: ok, G5: ok } });
  assert.equal(rows.find((r) => r.key === "G4").pass, null);
  assert.equal(gatesPass(rows), true);
  assert.equal(gatesPass(gateRows({ ok: true, gates: { G0: ok, G1: { pass: false, measures: {}, failures: [{ selector: "h1", detail: "Horizontal overflow" }] }, G2: ok, G3: ok, G5: ok } })), false);
  assert.equal(gatesPass(gateRows({ ok: false, error: "the renderer did not start" })), false);
});

// ---------------------------------------------------------------- through the real Studio, real gates, recorded answers
function studio(dir, settings, replies, critics) {
  const fc = path.join(dir, "fake-codex.json"), fr = path.join(dir, "fake-claude.json");
  writeFileSync(fc, J({ critics, replies })); writeFileSync(fr, J({ replies }));
  Object.assign(process.env, { STUDIO_BELT_STATE: path.join(dir, "no-belt-state.json"), BELT_STUDIO_DATA: dir, STUDIO_CLAUDE_CMD: FAKE_CLAUDE, STUDIO_FAKE_REPLIES: fr, STUDIO_CODEX_CMD: FAKE_CODEX, STUDIO_FAKE_CODEX: fc, STUDIO_FAKE_CODEX_COUNT: path.join(dir, "codex-count.txt") });
  writeFileSync(path.join(dir, "settings.json"), J({ allowed: PLAT, platform: PLAT, ...settings }));
  const S = createStudio({ HERE, json: (res, c, o) => res.done(o), body: (req, res, l, fn) => fn(req.body), onExit: false });
  delete process.env.BELT_STUDIO_DATA;
  S.call = (method, p, b) => new Promise((done) => S.handle({ method, body: b }, { done }, new URL("http://x" + p)));
  S.looks = async () => (await S.call("GET", "/api/studio/site?id=brightline")).looks;
  S.idle = () => until(async () => { const l = await S.looks(); return l && !l.working && l; }, 360000, "the looks to finish");
  return S;
}
const done = () => { for (const k of ["STUDIO_BELT_STATE", "STUDIO_CLAUDE_CMD", "STUDIO_FAKE_REPLIES", "STUDIO_CODEX_CMD", "STUDIO_FAKE_CODEX", "STUDIO_FAKE_CODEX_COUNT"]) delete process.env[k]; };
const recorded = (L, fam) => REC.replies[`Make look ${L} in the ${fam} family (round 1)`]?.text;

test("three looks through the Studio: a look that fails a gate is hidden until a version passes; the critic is read strictly; Love it / No persists; bindings never change", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-looks-"));
  // look B's first answer is HAND-MADE to fail a hard gate for real: one unbreakable fifty-letter word spills off a phone
  // screen (G1). Its remake (round 2) is the real recorded answer. A and C are the real recorded answers.
  const replies = {
    "Make look A in the showroom family (round 1)": { text: recorded("A", "showroom") },
    "Make look B in the neighbourhood family (round 1)": { hand: true, text: J({ ...JSON.parse(recorded("B", "neighbourhood")), copy: { ...JSON.parse(recorded("B", "neighbourhood")).copy, hero: { eyebrow: "", headline: "Brightlineautocarecomesrightouttoyourdrivewaytoday everywhere", sub: "" } } }) },
    "Make look B in the neighbourhood family (round 2)": { text: recorded("B", "neighbourhood") },
    "Make look C in the workshop family (round 1)": { text: recorded("C", "workshop") },
  };
  for (const [k, v] of Object.entries(replies)) assert.ok(v.text, `a recorded answer for ${k}`);
  // the critic: A's real answer; then, for C, a malformed answer twice (it is asked twice); then B's real answer
  const critics = [REC.critics[0].answer, "{\"items\": \"not the shape\"}", "{\"items\": \"not the shape\"}", REC.critics[1]?.answer || REC.critics[0].answer];
  const S = studio(dir, { lookMaker: "claude", lookRounds: 2 }, replies, critics);
  try {
    await S.swept;
    assert.equal((await S.call("POST", "/api/studio/example")).ok, true);
    const base = S.store.revision("brightline", 1).spec;
    const r = await S.call("POST", "/api/studio/looks/make", { site: "brightline" });
    assert.equal(r.ok, true, r.said);
    // while B's first version is hidden, it is never "shown"
    let sawHidden = false;
    const final = await until(async () => {
      const l = await S.looks(), b = l.letters.find((x) => x.letter === "B");
      if (b.last?.v === 1 && b.last.status === "hidden") { sawHidden = true; assert.equal(b.shown, null, "a look that failed a gate is not shown"); }
      return !l.working && l;
    }, 360000, "the looks to finish");
    const set = S.store.lookSet("brightline", final.id), [A, B, C] = ["A", "B", "C"].map((L) => final.letters.find((x) => x.letter === L));
    // B: version 1 failed G1 for real and was hidden; version 2 (the remake, told the problem) passed and is the one shown
    assert.ok(sawHidden || set.letters.B.versions[0].status === "hidden");
    assert.equal(set.letters.B.versions[0].status, "hidden");
    assert.equal(set.letters.B.versions[0].gates.find((g) => g.key === "G1").pass, false);
    assert.match(set.letters.B.versions[0].said, /G1 Layout/);
    assert.equal(B.shown?.v, 2, "the fixed version is shown");
    assert.match(set.letters.B.versions[1].fixes.join(" "), /Layout/, "the remake was told what failed");
    // A: shown, critiqued with the real recorded answer
    assert.equal(A.shown?.v, 1);
    assert.ok(A.shown.critic?.summary?.score > 0);
    // C: shown (its gates passed) but the malformed critic answer was refused: no score, and it says why
    assert.equal(C.shown?.v, 1);
    assert.equal(C.shown.critic?.summary ?? null, null);
    assert.match(C.shown.critic?.error || "", /did not give an answer the Studio could read/);
    // the three looks are distinct, and every one holds exactly revision 1's bindings
    const shownSpecs = ["A", "B", "C"].map((L) => set.letters[L].versions.find((v) => v.v === final.letters.find((x) => x.letter === L).shown.v).spec);
    assert.deepEqual(distinctness(shownSpecs.map((spec, i) => ({ letter: "ABC"[i], spec }))), []);
    for (const spec of shownSpecs) assert.deepEqual(bindingSet(spec), bindingSet(base));
    for (const L of ["A", "B", "C"]) for (const v of set.letters[L].versions) if (v.spec) assert.deepEqual(bindingSet(v.spec), bindingSet(base), `look ${L} v${v.v}`);
    // the screenshots the critic saw are served
    const shot = await new Promise((resolve) => S.handle({ method: "GET" }, { writeHead: (c) => resolve(c), end() {}, done: () => resolve(404) }, new URL(`http://x/api/studio/looks/shot?site=brightline&set=${final.id}&letter=A&v=1&w=390`)));
    assert.equal(shot, 200);

    // LOVE IT / NO: kept in the site's taste log, and still there after a restart; pressing again clears it
    assert.equal((await S.call("POST", "/api/studio/looks/taste", { site: "brightline", set: final.id, letter: "A", verdict: "love" })).ok, true);
    assert.equal((await S.call("POST", "/api/studio/looks/taste", { site: "brightline", set: final.id, letter: "C", verdict: "no" })).ok, true);
    assert.equal((await S.call("POST", "/api/studio/looks/taste", { site: "brightline", set: final.id, letter: "B", verdict: "maybe" })).ok, true, "anything else clears");
    S.close();
    const S2 = studio(dir, { lookMaker: "claude", lookRounds: 2 }, replies, critics);
    await S2.swept;
    const again = await S2.looks();
    assert.deepEqual(again.letters.map((l) => l.taste), ["love", null, "no"]);
    const log = openStore(dir).taste("brightline");
    assert.deepEqual(log.map((x) => [x.letter, x.verdict]), [["A", "love"], ["C", "no"], ["B", null]]);
    assert.equal(log[0].family, "showroom"); assert.ok(log[0].spec_hash && log[0].shot);
    await S2.call("POST", "/api/studio/looks/taste", { site: "brightline", set: final.id, letter: "C", verdict: "love" });
    assert.equal((await S2.looks()).letters.find((l) => l.letter === "C").taste, "love");
    // a hidden or unmade look cannot be judged
    assert.equal((await S2.call("POST", "/api/studio/looks/taste", { site: "brightline", set: "lnope0000", letter: "A", verdict: "love" })).ok, false);

    // USE THIS LOOK: a new revision through the quick check, with exactly the same bindings; revision 1 is unchanged
    const u = await S2.call("POST", "/api/studio/looks/use", { site: "brightline", set: final.id, letter: "A" });
    assert.equal(u.ok, true, u.said);
    const rev = S2.store.revision("brightline", u.n);
    assert.deepEqual(bindingSet(rev.spec), bindingSet(base));
    assert.equal(rev.spec.tokens.family, "showroom");
    assert.equal(J(S2.store.revision("brightline", 1).spec), J(base));
    S2.close();
  } finally { done(); try { S.close(); } catch {} rmSync(dir, { recursive: true, force: true }); }
});

test("a maker's answer that is malformed or puts a typed price in the words makes no look; a usage limit waits", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-looks-"));
  const priced = JSON.parse(recorded("A", "showroom"));
  priced.copy.hero.headline = "Full detail from $185.";
  const replies = {
    "Make look A in the showroom family (round 1)": { hand: true, text: J(priced) },
    "Make look B in the neighbourhood family (round 1)": { hand: true, text: "Here is my design: a calm blue page." },
    "Make look C in the workshop family (round 1)": { hand: true, limited: "You've hit your usage limit · resets 11:40pm" },
  };
  const S = studio(dir, { lookMaker: "claude", lookRounds: 1 }, replies, []);
  try {
    await S.swept;
    await S.call("POST", "/api/studio/example");
    assert.equal((await S.call("POST", "/api/studio/looks/make", { site: "brightline" })).ok, true);
    const l = await until(async () => { const x = await S.looks(); const c = S.store.jobs().find((j) => j.kind === "look" && j.letter === "C"); return c?.status === "waiting" && x.letters.every((m) => m.letter === "C" || m.last) && x; }, 300000, "A and B made, C waiting");
    const set = S.store.lookSet("brightline", l.id);
    assert.equal(set.letters.A.versions[0].status, "refused");
    assert.match(set.letters.A.versions[0].said, /"\$185"/, "the platform's validator refused the typed price");
    assert.equal(set.letters.B.versions[0].status, "refused");
    assert.match(set.letters.B.versions[0].said, /not in the shape/);
    assert.equal(l.letters.find((x) => x.letter === "A").shown, null);
    assert.equal(l.letters.find((x) => x.letter === "C").job.status, "waiting");
    // Stop: the waiting job is stopped and nothing more is made
    assert.equal((await S.call("POST", "/api/studio/looks/stop", { site: "brightline" })).ok, true);
    assert.equal((await S.looks()).working, false);
  } finally { done(); S.close(); rmSync(dir, { recursive: true, force: true }); }
});

// ---------------------------------------------------------------- after the S6 review (REVIEW-S6.md)
const yesAnswer = (e) => ({ answer: "yes", evidence: e });
const PERFECT = { items: Object.fromEntries(Object.entries(rubric.items).map(([g, ks]) => [g, Object.fromEntries(ks.map((k) => [k, yesAnswer("clear in the captures")]))])),
  pay: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`Q${i + 1}`, i === 8 ? { answer: "no", evidence: "nothing broken" } : yesAnswer("seen on the first screen")])) };
const withCopy = (text, change) => { const j = JSON.parse(text); change(j); return J(j); };
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch { return false; } };

test("REVIEW-S6 F1: a look whose words state a fact the dashboard does not have is refused or hidden by a hard gate, never shown", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-looks-"));
  const replies = {
    "Make look A in the showroom family (round 1)": { text: recorded("A", "showroom") },
    // hand-made: work Brightline's dashboard does not list (only the dashboard check, gate G0, can know that)
    "Make look B in the neighbourhood family (round 1)": { hand: true, text: withCopy(recorded("B", "neighbourhood"), (j) => { j.copy.hero.headline = "Ceramic coating that lasts."; }) },
    // hand-made: the review's own probe, hours in words
    "Make look C in the workshop family (round 1)": { hand: true, text: withCopy(recorded("C", "workshop"), (j) => { j.copy.hero.headline = "Open every Sunday."; }) },
  };
  const S = studio(dir, { lookMaker: "claude", lookRounds: 1 }, replies, [PERFECT]);
  try {
    await S.swept;
    await S.call("POST", "/api/studio/example");
    assert.equal((await S.call("POST", "/api/studio/looks/make", { site: "brightline" })).ok, true);
    const l = await S.idle();
    const set = S.store.lookSet("brightline", l.id);
    assert.ok(l.letters.find((x) => x.letter === "A").shown, "the honest look is shown");
    const b = set.letters.B.versions[0], c = set.letters.C.versions[0];
    assert.equal(b.status, "hidden"); assert.equal(b.gates.find((g) => g.key === "G0").pass, false);
    assert.match(J(b.gates.find((g) => g.key === "G0").failures), /\\"ceramic\\" names work the dashboard does not list/);
    assert.equal(c.status, "refused"); assert.match(c.said, /"Sunday" says when the detailer works/);
    assert.equal(l.letters.find((x) => x.letter === "B").shown, null); assert.equal(l.letters.find((x) => x.letter === "C").shown, null);
    // REVIEW-S6 F6: the hidden look's pictures are not served, and the page is given none
    const status = (q) => new Promise((resolve) => S.handle({ method: "GET" }, { writeHead: (code) => resolve(code), end() {}, done: () => resolve(404) }, new URL(`http://x/api/studio/looks/shot?site=brightline&set=${l.id}&${q}`)));
    assert.ok(b.shots.length, "the hidden version was photographed (for the record)");
    assert.equal(await status("letter=B&v=1&w=390"), 404);
    assert.equal(await status("letter=B&v=1&w=390&view=top"), 404);
    assert.deepEqual(l.letters.find((x) => x.letter === "B").last.shots, []);
    assert.equal(await status("letter=A&v=1&w=390&view=top"), 200, "a shown look's view is served");
  } finally { done(); S.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("REVIEW-S6 F2: two remakes asking for the same order before either is critiqued never show together", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-looks-"));
  const Z = ["hero", "proof", "visit", "booking", "catalog"];   // neither family's own order
  const replies = {
    "Make look A in the showroom family (round 1)": { text: recorded("A", "showroom") },
    "Make look B in the neighbourhood family (round 1)": { text: recorded("B", "neighbourhood") },
    "Make look C in the workshop family (round 1)": { text: recorded("C", "workshop") },
    "Make look A in the showroom family (round 2)": { hand: true, text: withCopy(recorded("A", "showroom"), (j) => { j.order = Z; }) },
    "Make look B in the neighbourhood family (round 2)": { hand: true, text: withCopy(recorded("B", "neighbourhood"), (j) => { j.order = Z; }) },
  };
  const low = REC.critics[1].answer;   // a real answer; with one round there is no automatic remake
  const S = studio(dir, { lookMaker: "claude", lookRounds: 1 }, replies, [low, low, low, PERFECT, PERFECT]);
  try {
    await S.swept;
    await S.call("POST", "/api/studio/example");
    await S.call("POST", "/api/studio/looks/make", { site: "brightline" });
    const first = await S.idle();
    // both remakes queued at once; B's maker runs before A's critic (the review's sequence)
    assert.equal((await S.call("POST", "/api/studio/looks/remake", { site: "brightline", set: first.id, letter: "A" })).ok, true);
    assert.equal((await S.call("POST", "/api/studio/looks/remake", { site: "brightline", set: first.id, letter: "B" })).ok, true);
    const l = await S.idle();
    const set = S.store.lookSet("brightline", l.id);
    assert.equal(set.letters.A.versions[1].status, "shown");
    assert.equal(set.letters.B.versions[1].status, "too_close", "checked against A's new version, not only A's best-scored one");
    // and at display time: even if B's clashing version had passed and scored best, it is not shown beside A's
    set.letters.B.versions[1] = { ...set.letters.B.versions[1], status: "shown", critic: { summary: { score: 100 } } };
    set.letters.A.versions[1] = { ...set.letters.A.versions[1], critic: { summary: { score: 100 } } };
    S.store.saveLookSet("brightline", set);
    const v = await S.looks();
    const shown = v.letters.map((x) => x.shown && set.letters[x.letter].versions.find((y) => y.v === x.shown.v).spec).filter(Boolean);
    assert.equal(shown.length, 3);
    assert.deepEqual(distinctness(shown.map((spec, i) => ({ letter: "ABC"[i], spec }))), []);
    assert.equal(v.letters.find((x) => x.letter === "A").shown.v, 2);
    assert.equal(v.letters.find((x) => x.letter === "B").shown.v, 1, "B keeps its distinct version");
  } finally { done(); S.close(); rmSync(dir, { recursive: true, force: true }); }
});

test("REVIEW-S6 F4: the Claude critic runs with none of the user's settings, hooks or MCP servers", async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-critic-"));
  const shot = path.join(dir, "a.png"); writeFileSync(shot, "png");
  let seen = null;
  const tag = "6f1c0b9e-2d7a-4c1e-9a77-1b2c3d4e5f60";
  await runCritics({ out: dir, screenshots: [shot], models: ["claude"], tag, runner: async (command, args, opts) => { seen = { command, args, cwd: opts.cwd }; return { stdout: J({ structured_output: PERFECT }) }; } });
  for (const a of ["--safe-mode", "--strict-mcp-config", "--no-session-persistence", "--tools"]) assert.ok(seen.args.includes(a), a);
  assert.ok(!seen.args.includes("bypassPermissions"));
  assert.equal(seen.args[seen.args.indexOf("--tools") + 1], "Read");
  assert.ok(seen.cwd.includes(tag), "the job's session id names the critic's folder (review F7)");
  rmSync(dir, { recursive: true, force: true });
});

test("REVIEW-S6 F7: a ChatGPT maker's command line holds the job's session id, and a restart stops a leftover holding it", NEEDS, async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "studio-looks-")), log = path.join(dir, "codex.jsonl");
  const replies = { "Make look A in the showroom family (round 1)": { text: recorded("A", "showroom"), delayMs: 120000 } };
  process.env.STUDIO_FAKE_CODEX_LOG = log;
  let S = studio(dir, { lookMaker: "chatgpt", lookRounds: 1 }, replies, [PERFECT]);
  let leftover = null;
  try {
    await S.swept;
    await S.call("POST", "/api/studio/example");
    await S.call("POST", "/api/studio/looks/make", { site: "brightline" });
    const job = await until(() => S.store.jobs().find((j) => j.kind === "look" && j.letter === "A" && j.status === "running" && j.session), 60000, "the maker to start");
    const calls = () => { try { return readFileSync(log, "utf8").trim().split("\n").map((x) => JSON.parse(x)).filter((x) => !x.critic); } catch { return []; } };
    assert.ok(await until(() => calls().some((c) => c.args.some((a) => a.includes(job.session))), 30000, "the codex call holding the session id"), "the session id is on the command line");
    // a call a dead Control Room left behind, holding that session id on its command line, as a real one would
    leftover = spawn(process.execPath, ["-e", "setTimeout(() => {}, 600000)", path.join(os.tmpdir(), `studio-codex-${job.session}-x`, "answer.json")], { windowsHide: true, stdio: "ignore" });
    S.close();   // the job stays "running", as after a hard kill
    S = studio(dir, { lookMaker: "chatgpt", lookRounds: 1 }, {}, [PERFECT]);
    await S.swept;
    await until(() => !alive(leftover.pid), 20000, "the leftover to be stopped");
    assert.notEqual(S.store.job(job.id).status, "running");
  } finally { delete process.env.STUDIO_FAKE_CODEX_LOG; done(); S.close(); if (leftover && alive(leftover.pid)) spawnSync("taskkill", ["/T", "/F", "/PID", String(leftover.pid)], { windowsHide: true, stdio: "ignore" }); rmSync(dir, { recursive: true, force: true }); }
});
