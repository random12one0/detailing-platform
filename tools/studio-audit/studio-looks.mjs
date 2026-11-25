// ===========================================================================
// STUDIO LOOKS — three directions and the critic (STUDIO-SPEC.md §1a.6–7, §3 screens 3, 5, 6, §4c, §4e, §7 row S6).
// ===========================================================================
//
// The pure parts (tested in studio-looks.test.mjs) and the one ChatGPT call. studio.mjs runs them as jobs.
//
// A LOOK is one direction for a site: a style family (the platform's families.js: type pairing, colours, corners, a
// hero layout, a section order) plus the WORDING an AI maker writes for it. The maker never writes a binding and never
// writes a spec: it answers with three reasons, a section order and the words for each wording field, read strictly
// here. `assembleLook` then builds the spec from the site's own revision: every section, slot and binding is copied
// from it unchanged, so a look cannot change, drop or add a dashboard fact (proved in the tests: the binding set of a
// look equals its base revision's).
// THE DISTINCTNESS CHECK (§4c.6) compares the looks of a set: two that share a hero layout, a type pairing or a section
// order fail it, and the later one is not shown.
// THE CRITIC is ChatGPT (codex exec) reading only the screenshots, through site-critic.mjs and its strict reader
// (site-score.mjs validateCritic); `criticSummary` turns its answer into the panel's scores and the three fixes.
// THE REFEREE is site-browser.mjs's gates (studio-grade.mjs, in a child): a look that fails one is hidden.

import { spawn } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync, mkdtempSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { rubric, scoreCritic, validateCritic } from "./site-score.mjs";
import { looksExhausted, usageWords, resetFromText } from "./lib.mjs";

export const LETTERS = ["A", "B", "C"];
// Which three families a new set uses (Studio settings → "Three looks from"). The fourth is one tap away per look.
export const TRIOS = [
  ["showroom,neighbourhood,workshop", "Showroom, Neighbourhood and Precision workshop"],
  ["showroom,neighbourhood,boutique", "Showroom, Neighbourhood and Boutique"],
  ["showroom,workshop,boutique", "Showroom, Precision workshop and Boutique"],
  ["neighbourhood,workshop,boutique", "Neighbourhood, Precision workshop and Boutique"],
];
// The gates a look must pass to be shown. G4 (speed) is measured on the built site at Send for review, not here.
export const HARD_GATES = ["G0", "G1", "G2", "G3", "G5"];
export const GATE_NAMES = { G0: "Contract and connections", G1: "Layout", G2: "Accessibility", G3: "Booking path", G4: "Speed", G5: "Motion" };

const sectionsOf = (spec) => spec?.pages?.[0]?.sections || [];
const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
const typeOrder = (spec) => sectionsOf(spec).map((s) => s.type);

// ---------------------------------------------------------------- what the maker is asked
// The answer's shape, for this base spec: three reasons, the order of its section types, and the words for every
// wording field its types allow ("" leaves an optional field out).
export function lookSchema(baseSpec, types) {
  const str = { type: "string" };
  const copy = {};
  for (const t of new Set(typeOrder(baseSpec))) {
    const fields = types?.[t]?.copy || [];
    copy[t] = { type: "object", additionalProperties: false, required: fields, properties: Object.fromEntries(fields.map((f) => [f, str])) };
  }
  return { type: "object", additionalProperties: false, required: ["why", "order", "copy"], properties: {
    why: { type: "array", items: str, minItems: 3, maxItems: 3 },
    order: { type: "array", items: str },
    copy: { type: "object", additionalProperties: false, required: Object.keys(copy), properties: copy },
  } };
}
const words = (t) => String(t).trim().split(/\s+/).filter(Boolean).length;
const NAME = { hero: "First screen", catalog: "Prices", proof: "Photos and reviews", visit: "Hours and contact", booking: "Booking" };
// The request. `letter`, `family` (with key), the site's base spec and its section types, what the other looks of the
// set already use (so this one differs), and the fixes from the referee or the critic when it is a remake.
// `facts` (optional): what the dashboard says about the business, as context for the voice. Never to be copied in.
export function buildLookPrompt({ business, area, example, letter, family, baseSpec, types, others = [], fixes = [], round = 1, facts = null }) {
  const parts = sectionsOf(baseSpec).map((s) => {
    const fields = (types?.[s.type]?.copy || []).map((f) => `    - ${f}${types[s.type].required?.includes(f) ? " (required)" : ""}: ${s.copy?.[f] ? `${JSON.stringify(s.copy[f])} (${words(s.copy[f])} words)` : "(empty now)"}`).join("\n");
    return `- ${s.type} (${NAME[s.type] || s.type})\n${fields}`;
  }).join("\n");
  const taken = others.length ? `The other looks of this set already use these section orders; yours must differ from each:\n${others.map((o) => `- look ${o.letter} (${o.name}): ${o.order.join(", ")}`).join("\n")}` : "No other look has been made yet.";
  const remake = fixes.length ? `\nTHIS IS A REMAKE (round ${round}). The last version of this look had these problems. Fix them in the words and the order:\n${fixes.map((f) => `- ${f}`).join("\n")}\n` : "";
  const known = facts ? `\nWhat the dashboard says about the business (context for your words; NEVER copy a service name, price, town or hour into them):\n${Object.entries(facts).filter(([, v]) => v && v.length).map(([k, v]) => `- ${k}: ${Array.isArray(v) ? v.join("; ") : v}`).join("\n")}\n` : "";
  return `The site: ${business || "a detailer"}${area ? `, serving ${area}` : ""}.${example ? " This is the Studio's EXAMPLE shop: a made-up business whose photo is an illustration and whose reviews are samples. Say so once, plainly, in the photos section's intro, and nowhere else (not in the first screen, not in the three reasons). Never claim real work, real customers or real results." : ""}
${known}
The family for look ${letter}: ${family.name} (${family.key}). ${family.line}
Its first screen is the "${family.hero}" layout. Its suggested section order: ${family.order.join(", ")}.

The wording fields, with the words they hold now (keep what is good, rewrite the rest in this family's voice):
${parts}

${taken}
${remake}
REQUEST: Make look ${letter} in the ${family.key} family (round ${round})

Answer with the JSON object only.`;
}

// ---------------------------------------------------------------- reading the maker's answer, strictly
const BINDING = /\b(?:service|service_group|gallery):[\w-]+|\b(?:gallery\.best|reviews\.top)\s*\(|\bhours\.week\b|\bcontact\.phone\b|"bind"\s*:|\{\{/i;
const BAD = "The look maker's answer was not in the shape the Studio reads, so nothing was made from it.";
// Returns { ok, why: [3], order: [types], copy: { type: { field: text } } } or { ok: false, said }.
export function readLook(raw, baseSpec, types) {
  const text = String(raw ?? "").trim();
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  let j = null;
  if (a >= 0 && b > a) try { j = JSON.parse(text.slice(a, b + 1)); } catch {}
  const bad = (said = BAD) => ({ ok: false, said });
  if (!isObj(j) || Object.keys(j).sort().join() !== "copy,order,why") return bad();
  if (BINDING.test(JSON.stringify(j))) return bad("The look maker's answer tried to write a dashboard link into the site, so nothing was made from it.");
  if (!Array.isArray(j.why) || j.why.length !== 3 || j.why.some((w) => typeof w !== "string" || !w.trim() || w.length > 240)) return bad();
  const want = typeOrder(baseSpec);
  if (!Array.isArray(j.order) || j.order.length !== want.length || [...j.order].sort().join() !== [...want].sort().join())
    return bad("The look maker's section order does not hold exactly this site's sections, so nothing was made from it.");
  if (j.order[0] !== "hero") return bad("The look maker did not put the first screen first, so nothing was made from it.");
  if (!isObj(j.copy) || Object.keys(j.copy).sort().join() !== [...new Set(want)].sort().join()) return bad();
  const copy = {};
  for (const t of Object.keys(j.copy)) {
    const fields = types?.[t]?.copy || [], got = j.copy[t];
    if (!isObj(got) || Object.keys(got).some((f) => !fields.includes(f))) return bad();
    copy[t] = {};
    for (const f of fields) {
      const v = got[f];
      if (v !== undefined && typeof v !== "string") return bad();
      const w = String(v ?? "").replace(/\s+/g, " ").trim();
      if (w.length > 400) return bad(`The look maker wrote more than 400 letters for ${NAME[t] || t} · ${f}, so nothing was made from it.`);
      if (!w && types[t].required?.includes(f)) return bad(`The look maker left ${NAME[t] || t} · ${f} empty, and it is required, so nothing was made from it.`);
      if (w) copy[t][f] = w;
    }
  }
  return { ok: true, why: j.why.map((w) => w.trim()), order: j.order, copy };
}

// ---------------------------------------------------------------- the spec of a look
// Every section, slot and binding is the base revision's; only the order, the wording, the hero layout and the tokens
// come from the look. NOTHING here can write a binding.
export function assembleLook(baseSpec, family, look) {
  const secs = sectionsOf(baseSpec);
  const sections = look.order.map((t) => {
    const s = structuredClone(secs.find((x) => x.type === t));
    s.copy = { ...look.copy[t] };
    if (t === "hero") s.variant = family.hero;
    return s;
  });
  return { schema: baseSpec.schema, slug: baseSpec.slug, tokens: { ...family.tokens }, pages: [{ path: "/", sections }] };
}
// Every binding of a spec, as "type.slot=binding" in a sorted list (order of sections does not matter).
export function bindingSet(spec) {
  const out = [];
  for (const s of sectionsOf(spec)) for (const [k, v] of Object.entries(s)) if (isObj(v) && typeof v.bind === "string") out.push(`${s.type}.${k}=${v.bind}`);
  return out.sort();
}

// ---------------------------------------------------------------- the distinctness check (§4c.6)
export const heroOf = (spec) => sectionsOf(spec).find((s) => s.type === "hero")?.variant || "poster";
export const pairingOf = (spec) => `${spec?.tokens?.font_display || "?"} + ${spec?.tokens?.font_body || "?"}`;
// `looks`: [{ letter, spec }] in making order. Returns one problem per clash: { letter (the later one), with, what }.
export function distinctness(looks) {
  const out = [], seen = [];
  for (const l of looks) {
    for (const o of seen) {
      const what = [heroOf(l.spec) === heroOf(o.spec) && `the same first-screen layout (${heroOf(l.spec)})`,
        pairingOf(l.spec) === pairingOf(o.spec) && `the same type pairing (${pairingOf(l.spec)})`,
        typeOrder(l.spec).join() === typeOrder(o.spec).join() && "the same section order"].filter(Boolean);
      if (what.length) out.push({ letter: l.letter, with: o.letter, what });
    }
    seen.push(l);
  }
  return out;
}

// ---------------------------------------------------------------- the referee's gates, in plain words
// gates.json from studio-grade.mjs → [{ key, name, pass, said }] in G0..G5 order. G4 is "not measured here".
export function gateRows(result) {
  const g = result?.gates || {};
  return ["G0", "G1", "G2", "G3", "G4", "G5"].map((key) => {
    if (key === "G4") return { key, name: GATE_NAMES[key], pass: null, said: "Measured on the finished site at Send for review, not on a look." };
    const x = g[key];
    if (!x) return { key, name: GATE_NAMES[key], pass: false, said: result?.error ? `Not measured: ${result.error}` : "Not measured." };
    const f = x.failures || [];
    const m = x.measures || {};
    const good = { G0: `${m.stamps ?? 0} bound items, ${m.connections ?? 0} different connections, all match the dashboard`,
      G1: "Nothing spills, overlaps or is too small to tap, at 390, 768 and 1440", G2: "No serious accessibility problem; keyboard and focus work", G3: "Book on the first phone screen, step one in two taps, call and text, search details",
      G5: "Calm motion; everything shows with reduced motion" }[key];
    const kinds = [...new Set(f.map((z) => z.detail))];
    return { key, name: GATE_NAMES[key], pass: x.pass === true && !f.length, said: x.pass === true && !f.length ? good : `${f.length} problem${f.length === 1 ? "" : "s"}: ${kinds.slice(0, 3).join("; ")}`, failures: f.slice(0, 12) };
  });
}
export const gatesPass = (rows) => rows.filter((r) => HARD_GATES.includes(r.key)).every((r) => r.pass === true);
// What a remake is told after the gates fail: the first few distinct problems, in the gate's words.
export const gateFixes = (rows) => rows.filter((r) => r.pass === false).flatMap((r) => [...new Set((r.failures || []).map((f) => `${r.name}: ${f.detail}${f.selector ? ` (at ${f.selector})` : ""}`))]).slice(0, 5);

// ---------------------------------------------------------------- the critic's answer, as the panel shows it
const WEIGHT = rubric.weights;
const ITEM = { focal_point: "One clear focal point", type: "Type", spacing: "Spacing", accent: "Use of the accent colour", imagery: "Photos", section_variety: "Sections differ from each other",
  navigation: "Navigation", booking: "Booking", readability: "Readability", tappability: "Easy to tap", legibility: "Legible", visible_content: "Nothing hidden or empty",
  distinct_identity: "Its own identity", describable_signature: "A signature you can describe", owner_voice: "Sounds like the owner", no_filler: "No filler", no_invented_claims: "No invented claims",
  bound_figures: "Figures come from the dashboard", story_headings: "Headings that tell the story" };
// validateCritic is the strict reader (exact keys, yes/no only, evidence required); anything else throws.
export function criticSummary(answer) {
  const c = validateCritic(answer);
  const qs = Array.from({ length: 12 }, (_, i) => `Q${i + 1}`);
  const pay = qs.map((k, i) => { const good = c.pay[k].answer === (k === "Q9" ? "no" : "yes"); return { key: k, q: rubric.payQuestions[i], answer: c.pay[k].answer, good, evidence: c.pay[k].evidence }; });
  const passes = pay.filter((p) => p.good).length, critical = rubric.critical.filter((k) => !pay.find((p) => p.key === k).good);
  const score = Math.round(scoreCritic(c) * 10) / 10;
  const items = Object.entries(rubric.items).flatMap(([group, keys]) => keys.map((k) => ({ group, key: k, name: ITEM[k] || k, answer: c.items[group][k].answer, evidence: c.items[group][k].evidence, weight: WEIGHT[group] / keys.length })));
  // The fixes that matter most: failed critical questions first, then failed items by weight, then other failed questions.
  const fixes = [
    ...pay.filter((p) => !p.good && rubric.critical.includes(p.key)).map((p) => ({ from: p.key, what: p.q, evidence: p.evidence })),
    ...items.filter((i) => i.answer === "no").sort((a, b) => b.weight - a.weight).map((i) => ({ from: i.key, what: i.name, evidence: i.evidence })),
    ...pay.filter((p) => !p.good && !rubric.critical.includes(p.key)).map((p) => ({ from: p.key, what: p.q, evidence: p.evidence })),
  ].slice(0, 3);
  return { score, passes, critical, pass: passes >= rubric.payMinimum && !critical.length && score >= rubric.scoreMinimum, scoreMinimum: rubric.scoreMinimum, payMinimum: rubric.payMinimum, pay, items, fixes };
}
// The note every critic gets about what it is looking at.
export const CRITIC_NOTE = "These are screen captures of one design direction for a detailer's website, exactly as a visitor sees the screen: on a phone (390 wide) the first screen, the second screen, the reviews and the booking form; on a tablet (768) at the top; on a desktop (1440) at the top and the booking form. The photo marked 'Example image' is an illustration and the reviews are marked as samples: this is the Studio's example shop, so judge them as honest placeholders, not as missing proof.";

// ---------------------------------------------------------------- one ChatGPT call (the "mixed" maker)
// codex exec, no shell (node + codex.js), read-only, no tools that run commands, the user's config ignored, the answer's
// shape as --output-schema, the prompt on stdin, the answer read from --output-last-message. Resolves like runClaude.
export const codexJs = () => process.env.STUDIO_CODEX_CMD || path.join(process.env.APPDATA || path.join(homedir(), "AppData/Roaming"), "npm/node_modules/@openai/codex/bin/codex.js");
export function runCodex({ js = codexJs(), model, effort, prompt, schema, ms, kill, onStart = () => {}, tag = "" }) {
  const t0 = Date.now();
  return new Promise((resolve) => {
    if (!existsSync(js)) return resolve({ ok: false, said: `ChatGPT's command (codex) could not be found at ${js}.`, ms: 0 });
    // the job's session id names the folder, so the command line (schema and answer paths) holds it: a restarted Control
    // Room finds this call by it and stops it (review F7)
    const dir = mkdtempSync(path.join(tmpdir(), `studio-codex-${/^[0-9a-f-]{36}$/.test(tag) ? tag + "-" : ""}`));
    const schemaFile = path.join(dir, "schema.json"), answer = path.join(dir, "answer.json");
    writeFileSync(schemaFile, JSON.stringify(schema));
    const args = [js, "exec", "--skip-git-repo-check", "--ephemeral", "--ignore-user-config", "--disable", "shell_tool", "--disable", "unified_exec", "--disable", "multi_agent",
      "-s", "read-only", ...(model ? ["-m", model] : []), ...(effort ? ["-c", `model_reasoning_effort=${effort}`] : []), "--output-schema", schemaFile, "--output-last-message", answer, "-"];
    const child = spawn(process.execPath, args, { cwd: tmpdir(), windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "", late = false, settled = false;
    // (a folder Windows still holds, because the call is being stopped, is left for the OS: removing it must never throw)
    const done = (r) => { if (!settled) { settled = true; clearTimeout(timer); try { rmSync(dir, { recursive: true, force: true }); } catch {} resolve({ ...r, ms: Date.now() - t0 }); } };
    const timer = setTimeout(() => { late = true; kill(child.pid); done({ ok: false, said: `ChatGPT took longer than ${Math.round(ms / 1000)} seconds and was stopped.` }); }, ms);
    onStart(child.pid);
    child.stdout.on("data", (d) => { out = (out + d).slice(-4000); });
    child.stderr.on("data", (d) => { err = (err + d).slice(-4000); });
    child.on("error", (e) => done({ ok: false, said: `ChatGPT's command could not start: ${e.message}` }));
    child.on("close", (code) => {
      if (late) return;
      let text = ""; try { text = readFileSync(answer, "utf8"); } catch {}
      if (code === 0 && text.trim()) return done({ ok: true, text });
      const all = `${out}\n${err}`;
      if (usageWords(all) || looksExhausted(all)) return done({ ok: false, limited: true, resetAt: resetFromText(all) || null, said: "ChatGPT is out of its usage limit." });
      done({ ok: false, said: `ChatGPT stopped without an answer: ${(err || out).trim().split("\n").filter(Boolean).pop()?.slice(0, 200) || `code ${code}`}` });
    });
    child.stdin.on("error", () => {});
    child.stdin.end(prompt);
  });
}
