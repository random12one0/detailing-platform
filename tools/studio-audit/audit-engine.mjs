// ===========================================================================
// THE AUDIT ENGINE — runs a whole audit (plan §3, §7, §9, §12 chunks 3–5).
// ===========================================================================
//
// A run is split into CELLS (one area × one kind of check). Each cell is one
// fresh AI session with no memory of earlier chats (plan §3.1): it reads the
// code read-only and writes its findings as JSON into its own folder. Then:
//   1. the ENGINE checks every file:line a finding cites really exists — a
//      finding whose evidence is invented is rejected without spending a cent;
//   2. a DIFFERENT model re-checks each surviving finding from its evidence alone,
//      and searches ROADMAP.md for an open item that already covers it.
// Only findings that survive both reach Andrew's inbox.
//
// Checkpoints are the store itself: every cell and finding has a status, so a
// restart puts interrupted cells back to "todo" and carries on (plan §9).
// The spending cap is hard: nothing new starts once it is reached, and anything
// running is stopped if a run overshoots it by more than the cost of one cell.

import { TOOL_DIR } from "./paths.mjs";
import { spawn, execFile } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync, closeSync, rmSync, fstatSync, readSync, appendFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { KINDS } from "./audit-store.mjs";
import * as CH from "./audit-chooser.mjs";
import { looksExhausted, claudeLaunch, claudeEnv } from "./lib.mjs";
import { areaBrief, buildMap } from "./audit-map.mjs";
import { sync } from "./audit-staging.mjs";
import { capture, plan as capturePlan, problems, missingKeyFunctions } from "./audit-capture.mjs";
import { JOURNEYS, SKIPPED, RESEED, runJourney, ensureApp, stagingSecretNames, prepareCheckout, removeCheckout } from "./audit-journeys.mjs";

const KIND_BRIEF = {
  code: `CODE. Look for real defects (wrong logic, wrong numbers, unhandled failures at the edges, races, missing checks), duplicated logic that has drifted apart, dead code, and complexity that buys nothing. Prefer what can hurt a customer, a detailer or their money.`,
  looks: `LOOKS & PHONES. Read the screens' code (JSX and CSS) for this area. 70-80% of people use a phone: judge everything at 390px first. Look for layouts that will break or crowd on a phone, missing loading/empty/error states, inconsistent buttons and spacing between screens, unclear wording, tap targets under 44px. You cannot open a browser in this run: say so under could_not_check and stick to what the code proves.`,
  security: `SAFETY. Tenant isolation (can one detailer or a stranger reach another business's data?), server functions callable without sign-in that should not be, access rules (read the migrations that create the policies), secrets reaching the browser, missing input checks where outside data comes in. Only report what you can point at in code.`,
  backend: `DATA. Database structure, constraints, indexes, triggers, access rules and migrations versus what the code expects; data that can end up inconsistent (a booking without a customer, a payment counted twice, wrong time zones); scheduled jobs that can run twice; slow or unbounded queries.`,
  integrations: `LINKS TO OUTSIDE SERVICES (Stripe, email, SMS, weather, maps, storage, anything else this area calls). For each: what happens when it fails or is slow, retries, duplicate events, webhook signature checks, timeouts, quotas and cost per call. Services are discovered from the code, never assumed.`,
  product: `PRODUCT. Things that work but could be clearly better, simpler or faster for a detailer or their customer; capabilities a paying detailer would expect that are missing; settings or steps that add effort for nothing. You may search the web for what competing booking tools for detailers offer. Every suggestion needs a concrete benefit, an honest effort and a risk.`,
};

const SEVERITY_RULES = `SEVERITY (pick exactly one):
- "blocker": must be fixed before selling: security hole, another business's data reachable, money wrong, data lost, a core flow (book, pay, sign up) broken.
- "before": should be fixed before launch: a real defect or usability problem a paying detailer or customer would hit.
- "after": worth fixing after launch.
- "idea": a new capability or larger improvement.
CATEGORY (pick exactly one): "defect" (broken or wrong), "improvement" (works, could be better), "opportunity" (missing), "debt" (costly to maintain), "unverified" (suspicious, not proven).`;

// How each CLI reads files. Claude Code has Read/Grep/Glob tools; Codex reads with shell commands.
export const TOOL_NOTE = {
  claude: "",
  codex: `\nHOW TO READ: use shell commands only to READ (rg, Get-Content, Select-String, git grep, git show). Never change, create or delete anything outside your current folder, never run the app, tests, installs or servers, never use the network.\n`,
};
const DEPTH_NOTE = {
  quick: "THIS IS A QUICK AUDIT: spend about 10 minutes. Go straight to the most likely serious problems; report only what you are sure of.",
  medium: "",
  deep: "THIS IS A DEEP AUDIT: be exhaustive. Follow every path from the starting points, including failure paths, retries, time zones and month ends, and concurrent use.",
};

export function auditorPrompt({ role, area, brief, repo, guidance, max = 8, focus = null, shots = [], provider = "claude", depth = "medium" }) {
  return `You are an independent auditor of a software product. You start fresh: trust the code and data, not old notes or claims.
${TOOL_NOTE[provider] || ""}${DEPTH_NOTE[depth] ? "\n" + DEPTH_NOTE[depth] + "\n" : ""}

THE PRODUCT: a booking and business platform for car detailers. Each detailer (a "tenant") gets a dashboard, a public booking page and optionally a website; their customers book, pay deposits and get emails. Front end React + Vite in app/, back end Supabase (Postgres + edge functions in supabase/functions/), Stripe, Resend for email.

THE CODE is at ${repo}. It is read-only for you. You may write ONLY in your current folder.
Never open ROADMAP.md whole (it is over 2 MB): search it with Grep if you need to.

YOUR AREA: ${area}. It is made of:
${brief}
(Follow the code from these starting points into anything they use.)

YOUR CHECK: ${KIND_BRIEF[role]}
${shots.length ? `
SCREENSHOTS of every screen in this area, taken just now on the laptop version. Open each with Read (they are images) and judge the phone (390) ones first. In "files" cite the code that draws what you saw (path:line, as always); name the screenshot file in "observed".
${shots.map((s) => "- " + s).join("\n")}
` : ""}${focus ? `
DIG DEEPER (Andrew asked): look hard at this one earlier finding and everything around it: is it real, how far does it reach, what else shares the cause?
${focus}
` : ""}
${SEVERITY_RULES}

GUIDANCE FROM THE OWNER:
${guidance}

WHAT TO HAND IN: write a file named findings.json in your current folder, exactly this shape:
{
  "summary": "two sentences: what you looked at and what you found",
  "checked": ["each thing you actually examined"],
  "could_read_code": true,
  "could_not_check": ["each thing you could not verify, and why"],
  "findings": [
    {
      "category": "defect", "severity": "before",
      "title": "one plain sentence a non-programmer understands",
      "intended": "what it is supposed to do",
      "implemented": "what the code actually does",
      "observed": "the concrete consequence for a detailer or customer",
      "recommendation": "the smallest change that fixes it",
      "files": ["path/from/project/root.ts:LINE", "other/file.jsx:START-END"],
      "repro": "steps someone could follow to see it, or empty",
      "confidence": "high|medium|low",
      "impact": "who is hurt and how much",
      "benefit": "what fixing it buys",
      "effort": "small|medium|large",
      "risk": "low|medium|high (risk of breaking something while fixing)"
    }
  ]
}
Set "could_read_code" to false if you could not open the code at all (and say why under could_not_check): a square that read nothing is never reported as clean.
At most ${max} findings, most important first. Every finding of category defect, debt or unverified MUST cite at least one file:line you actually read; the line numbers are checked automatically and a finding whose lines do not exist is thrown away. Finding nothing wrong is a good result: hand in "findings": [] and say what you checked.

When the file is written, reply with one line: DONE <number of findings>.`;
}

export function checkerPrompt({ finding, repo, provider = "claude" }) {
  const f = { title: finding.title, category: finding.category, severity: finding.severity, intended: finding.intended,
    implemented: finding.implemented, observed: finding.observed, files: finding.files, repro: finding.repro };
  return `You are an independent second checker. Another AI reported the finding below. Do NOT trust it: verify it yourself by reading the cited code at ${repo} (read-only; you may write only in your current folder).
${TOOL_NOTE[provider] || ""}

THE FINDING:
${JSON.stringify(f, null, 2)}

1. Read every cited file and line. Does the code really do what the finding says? Follow callers and guards elsewhere that might already prevent it.
2. Search ${repo}/ROADMAP.md with Grep (never open it whole) for an OPEN item (a line starting "- [ ]") that already covers this same problem. Call it a duplicate ONLY if that item names the same file and the same code path: fixing it would fix this. The same kind of problem in a different file or function is NOT a duplicate: put it under "related" instead, because a duplicate is hidden from Andrew. If it is a duplicate, give its number (like "97.12").
3. Is the severity right? ${SEVERITY_RULES.split("\n")[1]} ${SEVERITY_RULES.split("\n")[2]}

Write verdict.json in your current folder:
{"verdict": "confirmed|probable|disputed|rejected", "why": "two or three plain sentences with the file:line you checked", "duplicate_of": null, "related": [], "severity": "blocker|before|after|idea"}
("related": open roadmap item numbers that share the same root cause or the same code without being the same problem, so they can be fixed together; [] if none.)
- confirmed: you saw it in the code yourself.
- probable: consistent with the code, but only running it would prove it.
- disputed: partly wrong (wrong cause, wrong size, or already guarded somewhere).
- rejected: not real.
Then reply with one line: VERDICT <word>.`;
}

// "path:12" or "path:12-30" → { file, from, to } or null.
export function parseRef(ref) {
  const m = String(ref).trim().match(/^(.+?):(\d+)(?:-(\d+))?$/);
  if (!m) return null;
  return { file: m[1].replace(/\\/g, "/").replace(/^\.\//, ""), from: Number(m[2]), to: Number(m[3] || m[2]) };
}
// Evidence the engine can check without any AI: the file exists and has those lines.
export function checkRefs(refs, repo) {
  const good = [], bad = [];
  for (const r of refs || []) {
    const p = parseRef(r);
    if (!p) { bad.push({ ref: r, why: "not in path:line form" }); continue; }
    const abs = path.isAbsolute(p.file) ? p.file : path.join(repo, p.file);
    let n = 0; try { n = readFileSync(abs, "utf8").split("\n").length; } catch { bad.push({ ref: r, why: "no such file" }); continue; }
    if (p.from < 1 || p.to > n || p.to < p.from) bad.push({ ref: r, why: `the file has ${n} lines` }); else good.push(r);
  }
  return { good, bad };
}

const SEVS = ["blocker", "before", "after", "idea"], CATS = ["defect", "improvement", "opportunity", "debt", "unverified"];
// A PowerShell write starts the file with a byte-order mark, which JSON.parse refuses (belt Lab, 2026-10-18).
export const readJSONFile = (file) => JSON.parse(readFileSync(file, "utf8").replace(/^﻿/, ""));
// "try again at 1:50 AM" / "resets at 3pm" -> the next such local time (ms), or null
export function untilFrom(text, now = Date.now()) {
  const m = String(text).match(/(?:try again|resets?)(?: at)? (\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\b/i);
  if (!m) return null;
  const d = new Date(now); let h = Number(m[1]) % 12; if (/p/i.test(m[3])) h += 12;
  d.setHours(h, Number(m[2] || 0), 0, 0);
  if (d.getTime() <= now) d.setDate(d.getDate() + 1);
  return d.getTime() + 60000;   // a minute after, so the first try is not refused again
}
export const providerOf = (model) => (/^gpt|^o\d|codex/i.test(String(model)) ? "codex" : "claude");
// Reads and tidies an auditor's findings.json. Never throws.
export function readFindings(file) {
  let raw; try { raw = readJSONFile(file); } catch (e) { return { ok: false, why: existsSync(file) ? `findings.json is not valid JSON (${e.message.slice(0, 80)})` : "no findings.json was written" }; }
  const list = Array.isArray(raw.findings) ? raw.findings : [];
  const clean = list.filter((f) => f && typeof f.title === "string" && f.title.trim()).map((f) => ({
    ...f,
    title: f.title.trim().slice(0, 300),
    severity: SEVS.includes(f.severity) ? f.severity : "after",
    category: CATS.includes(f.category) ? f.category : "unverified",
    files: Array.isArray(f.files) ? f.files.map(String).slice(0, 12) : [],
  }));
  // read nothing = failed, never "clean" (2026-10-23: a sandboxed auditor that was denied every file handed in [] honestly)
  if (raw.could_read_code === false) return { ok: false, unread: true, why: `the auditor could not read the code (${String((raw.could_not_check || [])[0] || raw.summary || "no reason given").slice(0, 300)})` };
  return { ok: true, summary: String(raw.summary || "").slice(0, 1500), checked: raw.checked || [], couldNot: raw.could_not_check || [], findings: clean };
}

// The second checker is a different model from the finder (plan §7).
export function checkerFor(finderModel, settings = {}) {
  const want = settings.checkerModel || "claude-sonnet-5-5";
  return want === finderModel ? (finderModel === "opus" ? "claude-sonnet-5-5" : "opus") : want;
}

// FINGERPRINTS: the same problem must not come back as a new card every run (review 2026-10-20).
// An AI finding is "the same" when the same kind of auditor cites the same file within ~25 lines;
// with no file, the same title. Screens and journeys have exact keys (see their callers).
// two titles are about the same problem when they share enough of their meaningful words
export function similar(a, b) {
  const w = (s) => new Set(String(s).toLowerCase().split(/[^a-z0-9]+/).filter((x) => x.length > 3));
  const A = w(a), B = w(b); if (!A.size || !B.size) return false;
  let n = 0; for (const x of A) if (B.has(x)) n++;
  return n / Math.min(A.size, B.size) >= 0.4;
}
export function aiKey(role, ref, title) {
  const p = parseRef(ref || "");
  return p ? `ai|${role}|${p.file}|${Math.floor(p.from / 25)}` : `ai|${role}|title|${String(title).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().slice(0, 80)}`;
}

const DEFAULT_MODELS = { code: "opus", looks: "claude-sonnet-5-5", security: "opus", backend: "opus", integrations: "claude-sonnet-5-5", product: "opus" };

// The audit's copy of the platform lives under the belt's jobs folder, as the belt's own job copies do.
export const jobsRootOf = (C) => (C && typeof C.jobsDir === "string" && C.jobsDir.trim() ? path.resolve(C.jobsDir.trim()) : path.join(TOOL_DIR, "data", "work"));

export function createEngine({ store, HERE, REPO, C = {}, beltBusy = () => false, log = () => {}, readStream, plainStep, agentCmd = null, preview = false, notify = null,
  readings = null, rateDir = process.env.AUDIT_RATE_DIR || HERE, checkoutDir = null }) {
  const dataDir = path.resolve(path.dirname(store.file || path.join(HERE, "data", "audit", "x")));
  const runsDir = path.join(dataDir, "runs");
  const evidenceRoot = path.join(path.dirname(runsDir), "evidence");   // served by audit.mjs at /audit/evidence/
  const jobsRoot = jobsRootOf(C);
  const tag = path.basename(dataDir).replace(/[^a-z0-9-]+/gi, "_");      // live and test stores never share folders
  const active = new Map();          // key ("cell:<id>" | "check:<id>") -> { child, stream, kind, id, provider, sessionId }
  let pumping = false, timer = null;
  const S = () => ({ capUsd: 25, parallel: 2, guidance: "", ...(C.audit || {}) });
  const AI = () => CH.settingsOf(C.audit || {});
  const modelFor = (kind) => (S().models || {})[kind] || DEFAULT_MODELS[kind] || "opus";
  const effortFor = (kind) => (S().efforts || {})[kind] || (kind === "check" ? "medium" : "high");

  // ── WHO HAS ROOM: usage readings (the Control Room refreshes ChatGPT's every 90 s; Claude's comes with every
  // Claude answer) and out-of-limit marks ──
  const readJ = (f) => { try { return readJSONFile(f); } catch { return null; } };
  function usageNow() {
    if (readings) return readings();
    const cl = readJ(path.join(rateDir, "claude-rate.json")), cx = readJ(path.join(rateDir, "codex-rate.json"));
    const pct = (u) => (u && typeof u.utilization === "number" ? Math.round(u.utilization * 100) : null);
    const usage = {
      claude: cl?.windows ? { at: cl.at, fiveHour: { pct: pct(cl.windows.five_hour), resetsAt: cl.windows.five_hour?.resetsAt }, week: { pct: pct(cl.windows.seven_day), resetsAt: cl.windows.seven_day?.resetsAt } } : null,
      codex: cx?.ok ? { at: cx.at, fiveHour: { pct: cx.primary?.pct ?? null, resetsAt: cx.primary?.resetsAt }, week: { pct: cx.secondary?.pct ?? null, resetsAt: cx.secondary?.resetsAt } } : null,
    };
    const down = { ...(store.get("aiDown") || {}) };
    if (cx?.ok && cx.limited) down.codex = { until: Math.max(down.codex?.until || 0, (cx.primary?.resetsAt || 0) * 1000, Date.now() + 15 * 60000) };
    return { usage, down };
  }
  function markDown(provider, text) {
    const d = store.get("aiDown") || {};
    const m = String(text).match(/resets? (?:at|in) ([^.\n]{3,40})/i);
    d[provider] = { until: untilFrom(text) || Date.now() + 30 * 60000, why: String(text).slice(0, 200), at: new Date().toISOString(), resets: m ? m[1] : null };
    store.set("aiDown", d);
    log(`AUDIT ${provider} reported its usage limit; it rests until ${new Date(d[provider].until).toLocaleString()}`);
  }
  // the chooser's decision for one job; every decision is kept for the Audit tab's "AI & limits" view
  function decide(job, run, r = usageNow()) {
    const cells = store.cells(run.id);
    if (path.resolve(repoFor(run)) === path.resolve(REPO)) job = { ...job, noCodex: true };
    // how far along: squares AND second checks (sweep 2026-10-23: counting squares alone called a run with 85 checks
    // still owed "100% done", so every check ran past his stop lines and ChatGPT hit its real limit)
    const done = cells.filter((c) => ["clean", "findings", "failed", "shelved", "skipped"].includes(c.status)).length;
    const fs0 = store.findings(run.id), owed = fs0.filter((f) => ["unverified", "checking"].includes(f.status)).length;
    const total = cells.length + fs0.length, finished = done + fs0.length - owed;
    const d = CH.choose(job, { s: AI(), depth: run.scope?.depth || AI().depth, usage: r.usage, down: r.down,
      today: localDay(), now: Date.now(), progress: total ? finished / total : 0, plan: run.scope?.aiPlan || null });
    return d;
  }
  const localDay = (t = new Date()) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  function remember(run, what, d) {
    const list = store.get("aiChoices") || [];
    list.unshift({ at: new Date().toISOString(), run: run.n, what, provider: d.provider || null, model: d.model || null, effort: d.effort || null, why: d.why });
    store.set("aiChoices", list.slice(0, 30));
  }
  // the audit's own copy of the platform for this run (exact commit), or the real checkout when there is none
  const repoFor = (run) => { const co = run?.scope?.checkout; return co && existsSync(path.join(co, ".git")) ? co : REPO; };
  // measured: what one AI square has cost on average, second checks included (estimates and the limit use it)
  // per depth when that depth has been measured; otherwise every run (the page scales it and says so)
  const avgSquareUsd = (depth = null) => {
    const mine = (r) => (r.scope?.depth || "medium") === depth;
    const base = store.runs().filter((r) => !r.scope?.recheck && !r.scope?.bench);
    const measured = depth && base.filter(mine).flatMap((r) => store.cells(r.id)).filter((c) => KINDS.some((k) => k.id === c.kind) && ["clean", "findings"].includes(c.status)).length >= 2;
    const runs = measured ? base.filter(mine) : base;
    const squares = runs.flatMap((r) => store.cells(r.id)).filter((c) => KINDS.some((k) => k.id === c.kind) && ["clean", "findings"].includes(c.status)).length;
    const usd = runs.reduce((a, r) => a + (r.cost_usd || 0), 0);
    return squares >= 2 ? usd / squares : 5;
  };
  const folderFor = (run, name) => {
    const base = path.join(runsDir, run.id);
    const d = path.join(base, name.replace(/[^a-z0-9-]+/gi, "_")); mkdirSync(d, { recursive: true }); return d;
  };

  // ── one AI session, on Claude Code or Codex ──
  // Every provider hands back the same thing: a file in its folder (findings.json / verdict.json), a cost and a stream.
  function launch(key, { provider = "claude", folder, prompt, model, effort, tools, onDone, addDirs = [], repo = null, run = null }) {
    const stream = path.join(folder, "stream.jsonl");
    writeFileSync(stream, "");
    const fd = openSync(stream, "a");
    let cmd, args, env = { ...process.env }, viaFile = false;
    if (agentCmd) { cmd = agentCmd; args = ["--model", model, "--effort", effort, "--provider", provider]; }   // tests: one fake for both
    else if (provider === "codex") {
      cmd = C.agents?.["codex-review"]?.cmd || "codex";
      // danger-full-access ON PURPOSE (belt.config.json codex-review note): on Windows the sandboxed modes cannot run the
      // commands that READ files, and a reviewer that cannot read answers anyway. Read-only is in its brief.
      // Phase 1 B: web search on (a top-level flag, so before exec). Settings: flow.codexWebSearch.
      args = [...(C.flow?.codexWebSearch === false ? [] : ["--search"]), "exec", "--json", "--skip-git-repo-check", "--color", "never", "--ignore-user-config", "-s", "danger-full-access", "-m", model, "-c", `model_reasoning_effort=${effort}`];
    } else {
      cmd = (C.agents && C.agents.claude && C.agents.claude.cmd) || "claude";
      // R1 (2026-11-03): the shared Claude launch (full powers, his own login); `tools` is no longer passed (no lockdown).
      args = claudeLaunch({ model, effort, stream: true, extra: ["--add-dir", repo || REPO, ...addDirs.flatMap((d) => ["--add-dir", d])] });
      env = claudeEnv(process.env, { CLAUDE_CODE_MAX_OUTPUT_TOKENS: "32000" });
    }
    let child;
    try { child = spawn(cmd, args, { cwd: folder, shell: true, windowsHide: true, stdio: ["pipe", fd, "pipe"], env }); }
    catch (e) { closeSync(fd); onDone({ error: `could not start: ${e.message}` }); return; }
    let err = "";
    child.stderr.on("data", (c) => { err = (err + c).slice(-600); });
    child.on("error", (e) => { err += e.message; });
    child.on("close", (code) => {
      try { closeSync(fd); } catch {}
      const a = active.get(key);
      active.delete(key);
      let s = {}; try { s = readStream ? readStream(readFileSync(stream, "utf8")) : {}; } catch {}
      let cost = Number(s.cost) || 0;
      // Claude's answer carries its plan usage: keep the reading fresh for the chooser (and the belt, which reads the same file)
      if (provider === "claude" && s.rate?.unifiedWindows && !agentCmd) { try { writeFileSync(path.join(rateDir, "claude-rate.json"), JSON.stringify({ at: new Date().toISOString(), windows: s.rate.unifiedWindows }, null, 1)); } catch {} }
      // ChatGPT puts "You've hit your usage limit" in a failed step, not in its answer (sweep 2026-10-23: 5 squares were shelved as failures)
      const failedSteps = (s.steps || []).filter((x) => x.kind === "failed").map((x) => x.text);
      const said = [err, s.isError ? s.answer : "", code !== 0 ? s.answer : "", ...failedSteps].filter(Boolean).join(" ");
      const limited = (code !== 0 || s.isError) && looksExhausted(said);
      if (limited) markDown(provider, said);
      const result = { code, cost, answer: s.answer || "", limited, provider, error: code !== 0 && !s.answer ? (failedSteps.at(-1) || err.trim() || `stopped (exit ${code})`) : limited ? `${provider} is out of its usage limit` : null };
      onDone(result); pump();
    });
    child.stdin.end(viaFile ? "" : prompt);
    active.set(key, { child, stream, provider, model, run: run?.id || null });
  }
  const kill = (child) => { if (!child?.pid) return; try { spawn("taskkill", ["/T", "/F", "/PID", String(child.pid)], { windowsHide: true }); } catch {} };
  // Only the end of a stream is needed for "what is it doing now": never re-parse megabytes every 5 s.
  const tail = (file, bytes = 48 * 1024) => {
    const fd = openSync(file, "r");
    try {
      const size = fstatSync(fd).size, start = Math.max(0, size - bytes), buf = Buffer.alloc(size - start);
      readSync(fd, buf, 0, buf.length, start);
      const text = buf.toString("utf8");
      return start ? text.slice(text.indexOf("\n") + 1) : text;   // drop the cut-off first line
    } finally { closeSync(fd); }
  };
  // Stop must reach journeys and screenshots too: they are scripts and a browser, not AI children.
  let abort = new AbortController();

  function addCost(run, usd) {
    if (!usd) return;
    const r = store.run(run.id);
    store.setRun(run.id, { cost_usd: (r.cost_usd || 0) + usd });
  }

  // ── a cell: one auditor ──
  // ── a journey: one of the repo's own end-to-end scripts on the laptop app + staging ──
  // The second check is running it again: a failure that repeats is confirmed, one that
  // does not is marked flaky ("disputed"). One journey at a time: they share the demo business.
  let stopApp = null, secrets = null;
  // the demo business put back as seeded, once per run, before its first screenshot or journey
  async function reseedOnce(run) {
    if (store.get(`reseeded:${run.id}`)) return;
    if (!secrets) secrets = await stagingSecretNames(REPO).catch(() => []);
    const r = await runJourney(RESEED, { repo: repoFor(run), envRepo: REPO, evidenceDir: path.join(runsDir, run.id, "reseed"), secrets, signal: abort.signal });
    store.set(`reseeded:${run.id}`, { at: new Date().toISOString(), ok: r.ok && r.code === 0 });
    store.event(run.id, null, r.ok && r.code === 0 ? "reseed" : "warn", r.ok && r.code === 0 ? "The demo business on the test copy was reset." : `The demo business could not be reset (${r.skipped || "exit " + r.code}); results may be affected by earlier test data.`);
  }
  function startJourney(run, cell) {
    const j = JOURNEYS.find((x) => `journey:${x.id}` === cell.kind);
    if (!j) { store.setCell(cell.id, { status: "skipped", summary: "This journey is no longer in the library." }); return; }
    store.setCell(cell.id, { status: "running", role: "journey", attempts: (cell.attempts || 0) + 1, started_at: new Date().toISOString(), step: `running ${j.script}` });
    store.event(run.id, cell.id, "start", `Journey started: ${j.name}`);
    const done = (async () => {
      const dir = path.join(runsDir, run.id, `journey-${j.id}`);
      if (!stopApp) stopApp = await ensureApp(repoFor(run) !== REPO ? repoFor(run) : null);
      await reseedOnce(run);
      if (!secrets) secrets = await stagingSecretNames(REPO).catch(() => []);
      const first = await runJourney(j, { repo: repoFor(run), envRepo: REPO, evidenceDir: path.join(dir, "1"), secrets, signal: abort.signal });
      if (!first.ok) return { first };
      const second = first.failed ? await runJourney(j, { repo: repoFor(run), envRepo: REPO, evidenceDir: path.join(dir, "2"), secrets, signal: abort.signal }) : null;
      return { first, second };
    })();
    active.set(`cell:${cell.id}`, { child: { pid: 0 }, stream: null });
    done.then(({ first, second }) => {
      active.delete(`cell:${cell.id}`);
      if (store.run(run.id).status === "stopped") { store.setCell(cell.id, { status: "todo", step: null }); return; }
      if (!first.ok) {
        store.setCell(cell.id, { status: "skipped", step: null, summary: `Not run: ${first.skipped}.` });
        store.event(run.id, cell.id, "skip", `Journey not run (${j.name}): ${first.skipped}`);
        return;
      }
      store.putJourney({ id: j.id, name: j.name, area: j.area, steps: [j.script], source: "repo" });
      store.setJourney(j.id, { last_result: { passed: first.passed, failed: first.failed, at: new Date().toISOString(), seconds: first.seconds }, last_run_at: new Date().toISOString() });
      const again = new Set(second?.fails || []);
      for (const fail of first.fails) {
        const repeated = second && again.has(fail);
        const fkey = `journey|${j.id}|${fail.split(" — ")[0].slice(0, 160)}`;
        const seen = store.findingByKey(fkey);
        if (seen) { store.event(run.id, cell.id, "again", `Journey failure seen again, already known as ${seen.id} (${seen.status})`); continue; }
        const id = store.addFinding({ fkey, run_id: run.id, cell_id: cell.id, category: "defect", severity: "before", areas: [j.area],
          title: `${j.name}: ${fail.replace(/\s+—.*$/, "")}`.slice(0, 300), observed: fail.slice(0, 1500), files: [],
          repro: `node scripts/${j.script} ${(j.args || []).join(" ")} against the laptop app on staging`, finder_role: "journey", finder_model: "script",
          status: repeated ? "confirmed" : "disputed",
          second_check: { verdict: repeated ? "confirmed" : "disputed", by: "engine", why: repeated ? "It failed the same way when the journey was run a second time." : "It did not fail on a second run: flaky, or caused by something else running at the same time." } });
        store.addEvidence({ run_id: run.id, cell_id: cell.id, finding_id: id, kind: "test", ref: path.relative(runsDir, first.log).split(path.sep).join("/") });
      }
      store.setCell(cell.id, { status: first.failed ? "findings" : first.passed == null ? "failed" : "clean", step: null, ended_at: new Date().toISOString(),
        summary: first.passed == null ? "The script ended without reporting a result." : `${first.passed} passed, ${first.failed} failed in ${first.seconds}s.` });
      store.event(run.id, cell.id, "done", first.passed == null ? `Journey ${j.name}: did not run (no result was reported)` : `Journey ${j.name}: ${first.passed} passed, ${first.failed} failed`);
      pump();
    }).catch((e) => { active.delete(`cell:${cell.id}`); store.setCell(cell.id, { status: "failed", step: null, summary: String(e.message).slice(0, 500) }); pump(); });
  }

  // ── capture: every screen of one area, three widths, no AI (chunks 8–9) ──
  // Layout facts (too wide, too small, accessibility) are measurements and are confirmed as
  // they are; errors and failed requests are confirmed only if a second visit repeats them.
  function startCapture(run, cell) {
    store.setCell(cell.id, { status: "running", role: "capture", attempts: (cell.attempts || 0) + 1, started_at: new Date().toISOString(), step: "taking screenshots" });
    store.event(run.id, cell.id, "start", `${cell.area}: screenshots and checks of every screen started`);
    active.set(`cell:${cell.id}`, { child: { pid: 0 }, stream: null });
    const dir = path.join(evidenceRoot, run.id);
    (async () => {
      if (!stopApp) stopApp = await ensureApp(repoFor(run) !== REPO ? repoFor(run) : null);
      await reseedOnce(run);
      if (!secrets) secrets = await stagingSecretNames(REPO).catch(() => []);
      const missingFns = missingKeyFunctions(secrets, REPO);
      const items = await capturePlan({ areas: [cell.area] });
      const recs = await capture(items, { dir, signal: abort.signal, jsonName: `capture-${cell.area.replace(/\W+/g, "-")}.json`, log: (m) => store.setCell(cell.id, { step: m }) });
      let n = 0;
      for (const rec of recs) {
        for (const w of Object.keys(rec.widths || {})) {
          const shot = rec.widths[w].shot;
          if (shot) store.addEvidence({ run_id: run.id, cell_id: cell.id, kind: "shot", ref: `${run.id}/${path.basename(shot)}`, detail: `${rec.role} ${rec.path} at ${w}px` });
        }
        let ps = problems(rec, { missingFns });
        const flaky = ps.filter((p) => ["console", "requests", "click"].includes(p.kind));
        let again = null;
        if (flaky.length) { again = (await capture([rec], { dir: path.join(dir, "again"), jsonName: `again-${rec.id}.json` }))[0]; }
        const repeat = again ? new Set(problems(again, { missingFns }).map((p) => p.kind)) : new Set();
        for (const p of ps) {
          const fkey = `capture|${p.kind}|${rec.role}|${rec.path}`;
          const seen = store.findingByKey(fkey);
          if (seen) { store.event(run.id, cell.id, "again", `Seen again on ${rec.path}, already known as ${seen.id} (${seen.status})`); continue; }
          const needsRepeat = ["console", "requests", "click"].includes(p.kind);
          const ok = !needsRepeat || repeat.has(p.kind);
          const status = p.probable ? "probable" : ok ? "confirmed" : "disputed";
          const id = store.addFinding({ fkey, run_id: run.id, cell_id: cell.id, category: "defect", severity: p.severity, areas: [cell.area], files: [],
            title: p.title, observed: p.detail, repro: `Open ${rec.path} as ${rec.role} at ${p.widths.join(", ")}px on the laptop app (staging)`,
            finder_role: "capture", finder_model: "browser", status,
            second_check: { kind: p.kind, verdict: status, by: "engine", why: needsRepeat ? (ok ? "It happened again on a second visit." : "It did not happen on a second visit: flaky or caused by something else.") : "A measurement, not a judgement: the browser reported it directly." } });
          for (const w of p.widths) if (rec.widths[w]?.shot) store.addEvidence({ run_id: run.id, cell_id: cell.id, finding_id: id, kind: "shot", ref: `${run.id}/${path.basename(rec.widths[w].shot)}`, detail: `${rec.path} at ${w}px` });
          n++;
        }
      }
      return { screens: recs.length, n, skipped: recs.filter((r) => r.skipped).length };
    })().then(({ screens, n, skipped }) => {
      active.delete(`cell:${cell.id}`);
      if (store.run(run.id).status === "stopped") { store.setCell(cell.id, { status: "todo", step: null }); return; }
      store.setCell(cell.id, { status: n ? "findings" : "clean", step: null, ended_at: new Date().toISOString(),
        summary: `${screens} screens at 390, 768 and 1440${skipped ? ` (${skipped} could not be opened)` : ""}; ${n} problem${n === 1 ? "" : "s"} measured.` });
      store.event(run.id, cell.id, "done", `${cell.area}: ${screens} screens captured, ${n} problems measured`);
      pump();
    }).catch((e) => { active.delete(`cell:${cell.id}`); store.setCell(cell.id, { status: "failed", step: null, summary: String(e.message).slice(0, 500) }); pump(); });
  }

  // ── re-check: the belt ticked a 100.x item; is the problem really gone? (chunk 15) ──
  function startRecheck(run, cell) {
    const f = store.finding(cell.kind.slice("recheck:".length));
    if (!f) { store.setCell(cell.id, { status: "skipped", summary: "That finding is no longer in the audit." }); return; }
    // real = the check actually ran and judged. A check that could not run (no verdict, script could not
    // start, Stop pressed) is NOT "not fixed": the finding goes back to waiting and is tried again later,
    // at most 3 times (review 2026-10-20).
    const done = (fixed, why, cost = 0, real = true) => {
      active.delete(`cell:${cell.id}`);
      addCost(run, cost);
      const prev = f.second_check?.recheck || {};
      if (!real || store.run(run.id).status === "stopped") {
        store.setFinding(f.id, { status: "sent", second_check: { ...(f.second_check || {}), recheck: { tries: (prev.tries || 0) + 1, lastError: String(why).slice(0, 500) } } });
        store.setCell(cell.id, { status: "failed", step: null, ended_at: new Date().toISOString(), summary: `${f.id}: the re-check could not run (${String(why).slice(0, 300)}). It will be tried again.` });
        store.event(run.id, cell.id, "fail", `${f.id} / roadmap ${f.roadmap_id}: re-check could not run — ${String(why).slice(0, 200)}`);
        return pump();
      }
      store.setFinding(f.id, { status: fixed ? "rechecked" : "sent", second_check: { ...(f.second_check || {}), recheck: { fixed, why: String(why).slice(0, 1500), at: new Date().toISOString() } } });
      store.setCell(cell.id, { status: fixed ? "clean" : "findings", step: null, ended_at: new Date().toISOString(), summary: `${f.id} (${f.roadmap_id}): ${fixed ? "fixed, re-checked" : "NOT fixed"}. ${why}`.slice(0, 2000) });
      store.event(run.id, cell.id, fixed ? "rechecked" : "reopen", `${f.id} / roadmap ${f.roadmap_id}: ${fixed ? "fix confirmed" : "still there"} — ${String(why).slice(0, 200)}`);
      // a ticked box the code does not back up: Andrew must hear about it, it is never silent
      if (!fixed && notify) notify(`Roadmap ${f.roadmap_id} is ticked, but the problem is still there`, `${f.title.slice(0, 140)} — open the Audit tab, Findings, Sent.`);
      pump();
    };
    store.setCell(cell.id, { status: "running", role: "check", attempts: (cell.attempts || 0) + 1, started_at: new Date().toISOString(), step: `re-checking ${f.id}` });
    if (f.finder_role === "journey" || f.finder_role === "capture") {
      active.set(`cell:${cell.id}`, { child: { pid: 0 }, stream: null });
      (async () => {
        if (!stopApp) stopApp = await ensureApp();
        if (f.finder_role === "journey") {
          const j = JOURNEYS.find((x) => `journey:${x.id}` === store.cell(f.cell_id)?.kind);
          if (!j) return [false, "The journey it came from no longer exists.", false];
          const r = await runJourney(j, { repo: REPO, envRepo: REPO, signal: abort.signal, evidenceDir: path.join(runsDir, run.id, `recheck-${f.id}`), secrets: secrets || (secrets = await stagingSecretNames(REPO).catch(() => [])) });
          if (!r.ok || r.passed == null) return [false, r.ok ? "The journey ended without a result." : `The journey could not run: ${r.skipped}`, false];
          const still = (r.fails || []).some((x) => f.observed && x.startsWith(f.observed.slice(0, 60)));
          return [!still, still ? "The same check still fails in the journey." : `The journey no longer fails that check (${r.passed} passed, ${r.failed} failed).`, true];
        }
        const path0 = (f.repro || "").match(/^Open (\S+) as (\w+)/);
        const item = (await capturePlan()).find((x) => path0 && x.path === path0[1] && x.role === path0[2]);
        if (!item) return [false, "That screen is no longer in the capture plan.", false];
        const rec = (await capture([item], { dir: path.join(evidenceRoot, run.id), signal: abort.signal, jsonName: `recheck-${f.id}.json` }))[0];
        if (!rec || rec.skipped) return [false, rec?.skipped || "The screen could not be opened.", false];
        const kinds = problems(rec, { missingFns: missingKeyFunctions(secrets || [], REPO) });
        // by KIND of problem: a title carries counts and widths, so a half fix would change it and pass
        const still = kinds.some((p) => f.second_check?.kind ? p.kind === f.second_check.kind : p.title === f.title);
        return [!still, still ? "The screen still shows the same problem." : "The screen no longer shows the problem.", true];
      })().then(([ok, why, real]) => done(ok, why, 0, real)).catch((e) => done(false, `Re-check failed to run: ${e.message}`, 0, false));
      return;
    }
    const d = cell.choice;
    const folder = folderFor(run, `recheck-${f.id}`);
    rmSync(path.join(folder, "verdict.json"), { force: true });
    store.setCell(cell.id, { model: d.model });
    launch(`cell:${cell.id}`, {
      provider: d.provider, run, folder, model: d.model, effort: d.effort, tools: "Read,Grep,Glob,Write(./**),Edit(./**)",
      prompt: `${checkerPrompt({ finding: f, repo: REPO, provider: d.provider })}\n\nTHIS IS A RE-CHECK. The belt says roadmap item ${f.roadmap_id} fixed this. Read the CURRENT code at the cited places (lines may have moved) and decide whether the problem is really gone. Use verdict "rejected" if it is fixed (the problem no longer exists), "confirmed" if it is still there, "disputed" if only partly fixed. Explain in "why" exactly what changed.`,
      onDone: (r) => {
        let v = null; try { v = readJSONFile(path.join(folder, "verdict.json")); } catch {}
        if (!v) return done(false, r.limited ? `${d.provider} ran out of its usage limit` : "The re-checker did not hand in a verdict.", r.cost, false);
        done(v.verdict === "rejected", v.why || v.verdict, r.cost);
      },
    });
  }
  // Which sent findings has the belt ticked? (ROADMAP.md "- [x] **100.3 …")
  function tickedSent() {
    let text = ""; try { text = readFileSync(path.join(REPO, "ROADMAP.md"), "utf8"); } catch { return []; }
    const ticked = new Set([...text.matchAll(/^- \[[xX]\] \*\*(\d+\.\d+[a-z0-9]*)\b/gm)].map((m) => m[1]));
    return store.findings().filter((f) => f.status === "sent" && f.roadmap_id && ticked.has(f.roadmap_id) && !f.second_check?.recheck?.at && (f.second_check?.recheck?.tries || 0) < 3);
  }
  async function recheck() {
    const cur = store.latestRun();
    if (cur && ["running", "paused", "waiting"].includes(cur.status)) return { ok: false, said: "An audit is running; re-checks wait for it." };
    const due = tickedSent();
    if (!due.length) return { ok: true, said: "Nothing the belt fixed is waiting for a re-check." };
    for (const f of due) store.setFinding(f.id, { status: "fixed" });
    const run = store.newRun({ title: `Re-check of ${due.length} fixed item${due.length === 1 ? "" : "s"}`, scope: { recheck: due.map((f) => f.id) }, kinds: ["recheck"], cap_usd: Number(S().capUsd) || null });
    for (const f of due) store.addCell({ run_id: run.id, area: (f.areas || [])[0] || "Booking", kind: `recheck:${f.id}`, role: "check", model: f.finder_role === "journey" || f.finder_role === "capture" ? "browser" : checkerFor(f.finder_model, S()), id: `${run.id}:recheck:${f.id}` });
    store.setRun(run.id, { status: "running", started_at: new Date().toISOString() });
    store.event(run.id, null, "begin", `Re-checking ${due.map((f) => `${f.id} (${f.roadmap_id})`).join(", ")}`);
    pump();
    return { ok: true, said: `Re-checking ${due.length} fixed item${due.length === 1 ? "" : "s"}.`, run: run.id };
  }

  function startCell(run, cell) {
    if (cell.kind.startsWith("recheck:")) return startRecheck(run, cell);
    if (cell.kind.startsWith("journey:")) return startJourney(run, cell);
    if (cell.kind.startsWith("capture:")) return startCapture(run, cell);
    // a Dig deeper square gets its own folder, so the original square's evidence is never overwritten
    const d = cell.choice;
    const folder = folderFor(run, `${cell.area}-${cell.kind}${cell.id.includes(":dig-") ? "-dig-" + cell.id.split(":dig-")[1] : ""}`);
    rmSync(path.join(folder, "findings.json"), { force: true });
    const model = d.model;
    const depth = run.scope?.depth || "medium";
    store.setCell(cell.id, { status: "running", model, role: cell.kind, attempts: (cell.attempts || 0) + 1, started_at: new Date().toISOString(), step: "starting" });
    store.event(run.id, cell.id, "start", `${cell.area} × ${KINDS.find((k) => k.id === cell.kind)?.label || cell.kind}: auditor started (${CH.NAME[d.provider]} ${model}, ${d.effort}) — ${d.why}`);
    const tools = cell.kind === "product" ? "Read,Grep,Glob,WebSearch,WebFetch,Write(./**),Edit(./**)" : "Read,Grep,Glob,Write(./**),Edit(./**)";
    // screenshots are images only Claude Code's Read tool opens here; other AIs judge the looks from the code
    const shots = cell.kind === "looks" && d.provider === "claude" ? store.evidenceForCell(`${run.id}:capture:${cell.area}`).filter((e) => e.kind === "shot").map((e) => `${path.join(evidenceRoot, e.ref)} (${e.detail})`) : [];
    launch(`cell:${cell.id}`, {
      provider: d.provider, run, folder, model, effort: d.effort, tools,
      repo: repoFor(run),
      prompt: auditorPrompt({ role: cell.kind, area: cell.area, brief: areaBrief(store, cell.area).text, repo: repoFor(run), guidance: S().guidance || "",
        focus: cell.id.includes(":dig-") ? cell.summary : null, shots, provider: d.provider, depth, max: CH.DEPTHS[depth]?.max || 8 }),
      addDirs: shots.length ? [path.join(evidenceRoot, run.id)] : [],
      onDone: (r) => finishCell(run, cell, folder, r, model),
    });
  }

  function finishCell(run, cell, folder, r, model) {
    addCost(run, r.cost);
    const c = store.cell(cell.id);
    const cost = (c.cost_usd || 0) + (r.cost || 0);
    if (store.run(run.id).status === "stopped") { store.setCell(cell.id, { status: "todo", step: null, cost_usd: cost }); return; }
    const got = readFindings(path.join(folder, "findings.json"));
    // out of its usage limit: not the square's fault, so the try does not count; the chooser picks again
    if (!got.ok && (r.limited || r.held)) {
      store.setCell(cell.id, { status: "todo", step: null, cost_usd: cost, attempts: Math.max(0, (c.attempts || 1) - 1), summary: r.held ? `${r.error}; another AI or a later time takes it.` : `${CH.NAME[r.provider] || r.provider} ran out of its usage limit; another AI or a later time takes it.` });
      store.event(run.id, cell.id, "wait", `${cell.area} × ${cell.kind}: ${CH.NAME[r.provider] || r.provider} hit its usage limit; the square goes back in the queue`);
      return;
    }
    if (!got.ok) {
      const shelve = (c.attempts || 1) >= 2;   // the belt's stuck rule: twice, then shelved with the reason
      store.setCell(cell.id, { status: shelve ? "shelved" : "todo", step: null, cost_usd: cost, summary: `${got.why}${r.error ? " · " + r.error : ""}` });
      store.event(run.id, cell.id, "fail", `${cell.area} × ${cell.kind}: ${got.why}${shelve ? " (shelved after 2 tries)" : " (will try once more)"}`);
      return;
    }
    let kept = 0;
    let again = 0;
    for (const f of got.findings) {
      const needsProof = ["defect", "debt", "unverified"].includes(f.category);
      const { good, bad } = checkRefs(f.files, repoFor(run));
      // seen before (any run, any answer except "fixed and re-checked")? then do not ask Andrew again
      const fkey = aiKey(cell.kind, good[0] || f.files[0], f.title);
      // same place AND similar words, and only from EARLIER runs: one run's distinct findings are never merged
      const seen = store.findingsByKey(fkey).find((x) => x.run_id !== run.id && similar(x.title, f.title));
      if (seen) { again++; store.event(run.id, cell.id, "again", `Found again, already known as ${seen.id} (${seen.status}): ${f.title.slice(0, 120)}`); continue; }
      const id = store.addFinding({ fkey,
        run_id: run.id, cell_id: cell.id, category: f.category, severity: f.severity, title: f.title,
        areas: [cell.area], files: good, intended: f.intended || null, implemented: f.implemented || null, observed: f.observed || null,
        recommendation: f.recommendation || null, repro: f.repro || null, confidence: f.confidence || null, impact: f.impact || null,
        benefit: f.benefit || null, effort: f.effort || null, risk: f.risk || null, finder_role: cell.kind, finder_model: model,
      });
      for (const g of good) store.addEvidence({ run_id: run.id, cell_id: cell.id, finding_id: id, kind: "file", ref: g });
      if (bad.length) store.addEvidence({ run_id: run.id, cell_id: cell.id, finding_id: id, kind: "note", ref: `engine dropped ${bad.length} cited line(s) that do not exist`, detail: JSON.stringify(bad) });
      if (needsProof && !good.length) {
        store.setFinding(id, { status: "rejected", second_check: { verdict: "rejected", by: "engine", why: f.files.length ? "Every file and line it cited does not exist." : "It cited no code at all." } });
        store.event(run.id, cell.id, "reject", `${id} thrown out by the engine: its evidence does not exist`);
      } else { kept++; }
    }
    store.setCell(cell.id, { status: kept ? "findings" : "clean", step: null, ended_at: new Date().toISOString(), cost_usd: cost,
      summary: [got.summary, got.couldNot.length ? `Could not check: ${got.couldNot.join("; ")}` : ""].filter(Boolean).join(" ").slice(0, 2000) });
    store.event(run.id, cell.id, "done", `${cell.area} × ${cell.kind}: ${got.findings.length} found, ${kept} new with real evidence${again ? `, ${again} already known` : ""}`);
  }

  // ── a second check on one finding ──
  const checkJob = (f) => ({ role: "check", kind: f.finder_role, severity: f.severity, attempt: (f.second_check?.tries || 0) + 1,
    finder: { provider: providerOf(f.finder_model), model: f.finder_model } });
  function startCheck(run, f, d) {
    const folder = folderFor(run, `check-${f.id}`);
    rmSync(path.join(folder, "verdict.json"), { force: true });
    const model = d.model;
    store.setFinding(f.id, { status: "checking" });
    store.event(run.id, f.cell_id, "check", `${f.id}: second check started (${CH.NAME[d.provider]} ${model}, ${d.effort}) — ${d.why}`);
    // the checker reads the copy the finding came from; if that run's copy is gone, the current one
    const repo = (() => { const r0 = repoFor(store.run(f.run_id)); return existsSync(r0) ? r0 : repoFor(run); })();
    launch(`check:${f.id}`, {
      provider: d.provider, run, folder, model, effort: d.effort, tools: "Read,Grep,Glob,Write(./**),Edit(./**)",
      repo, prompt: checkerPrompt({ finding: f, repo, provider: d.provider }),
      onDone: (r) => {
        addCost(run, r.cost);
        let v = null; try { v = readJSONFile(path.join(folder, "verdict.json")); } catch {}
        const cur = store.finding(f.id);
        if (store.run(run.id).status === "stopped") { store.setFinding(f.id, { status: "unverified" }); return; }
        if (!v && (r.limited || r.held)) { store.setFinding(f.id, { status: "unverified", cost_usd: (cur.cost_usd || 0) + (r.cost || 0) }); return; }   // limit: not a failed try
        if (!v || !["confirmed", "probable", "disputed", "rejected"].includes(v.verdict)) {
          const tries = (cur.second_check?.tries || 0) + 1;
          const why = `The checker did not hand in a verdict${r.error ? ` (${String(r.error).slice(0, 200)})` : ""}.`;
          store.setFinding(f.id, { status: tries >= 2 ? "disputed" : "unverified", second_check: { verdict: null, by: model, why, tries }, cost_usd: (cur.cost_usd || 0) + (r.cost || 0) });
          // said out loud, and the try's stream kept: a retry reuses the folder (2026-10-23: a silent first try left no trace)
          store.event(run.id, f.cell_id, "fail", `${f.id}: second check by ${model} ended without a verdict${r.error ? `: ${String(r.error).slice(0, 160)}` : ""}${tries >= 2 ? " (given up after 2 tries)" : " (tries once more)"}`);
          try { const s0 = path.join(folder, "stream.jsonl"); writeFileSync(path.join(folder, `stream-try${tries}.jsonl`), readFileSync(s0)); } catch {}
          return;
        }
        const dup = v.duplicate_of && /^\d+\.\d+[a-z0-9]*$/i.test(String(v.duplicate_of)) ? String(v.duplicate_of) : null;
        store.setFinding(f.id, {
          status: dup && v.verdict !== "rejected" ? "duplicate" : v.verdict, duplicate_of: dup,
          severity: SEVS.includes(v.severity) ? v.severity : cur.severity,
          second_check: { verdict: v.verdict, by: model, why: String(v.why || "").slice(0, 1500), severityWas: cur.severity,
            related: (Array.isArray(v.related) ? v.related : []).map(String).filter((x) => /^\d+\.\d+[a-z0-9]*$/i.test(x)).slice(0, 5) },
          cost_usd: (cur.cost_usd || 0) + (r.cost || 0),
        });
        store.event(run.id, f.cell_id, "verdict", `${f.id}: ${v.verdict}${dup ? ` (already on the roadmap as ${dup})` : ""}`);
      },
    });
  }

  // ── the loop ──
  function pump() {
    if (pumping || preview) return;
    pumping = true;
    try {
      const run = store.latestRun();
      if (!run || !["running", "waiting"].includes(run.status)) return;
      // live step text for the page
      for (const [key, a] of active) {
        if (!readStream || !a.stream) continue;
        try {
          const s = readStream(tail(a.stream));
          if (!key.startsWith("cell:") || !plainStep) continue;
          const st = s.steps.map(plainStep).filter(Boolean).at(-1);
          if (st?.text) store.setCell(key.slice(5), { step: String(st.text).slice(0, 200) });
        } catch {}
      }
      // THE LIMIT. Cost is only known when a square finishes, so what is still working is counted at
      // the measured average: nothing new starts if it could take the run past the limit.
      const cap = run.cap_usd ?? S().capUsd;
      const working = [...active.keys()].filter((k) => !/:(journey|capture|recheck):/.test(k)).length;
      if (cap && run.cost_usd + working * avgSquareUsd() >= cap) {
        if (!active.size) finishRun(run, "stopped", `Stopped at the $${cap} spending limit.`);
        return;
      }
      const slots = Math.max(1, Number(S().parallel) || 2) - active.size;
      if (slots <= 0) return;
      // second checks owed from ANY run (a stopped run leaves some behind)
      const checks = store.owedChecks().filter((f) => !active.has(`check:${f.id}`));
      // journeys, screenshots and re-checks share the audit app and the demo business: one at a time
      const exclusive = (k) => /^(journey|capture|recheck):/.test(k);
      const exclusiveBusy = [...active.keys()].some((k) => /:(journey|capture|recheck):/.test(k));
      const all = store.cells(run.id);
      // a looks auditor waits for its area's screenshots
      const waitingForShots = (c) => c.kind === "looks" && all.some((x) => x.id === `${run.id}:capture:${c.area}` && ["todo", "running"].includes(x.status));
      const cells = all.filter((c) => c.status === "todo" && !active.has(`cell:${c.id}`) && !(exclusiveBusy && exclusive(c.kind)) && !waitingForShots(c))
        .filter((c, i, arr) => !exclusive(c.kind) || arr.findIndex((x) => exclusive(x.kind)) === i);
      // second checks first: they are short and they are what reaches Andrew. AI jobs ask the chooser first;
      // one with no AI that has room waits (the run says why and when it tries again) and the rest carry on.
      const queue = [...checks.map((f) => ({ ai: checkJob(f), go: (d) => startCheck(run, f, d), what: `second check of ${f.id}` })),
        ...cells.map((c) => {
          const ai = c.kind.startsWith("recheck:") ? (() => { const f = store.finding(c.kind.slice(8)); return f && !["journey", "capture"].includes(f.finder_role) ? checkJob(f) : null; })()
            : exclusive(c.kind) ? null : { role: "audit", kind: c.kind, area: c.area, attempt: (c.attempts || 0) + 1 };
          return { ai, go: (d) => startCell(run, d ? { ...c, choice: d } : c), what: `${c.area} × ${c.kind}` };
        })];
      let started = 0, waits = [];
      const R = queue.some((q) => q.ai) ? usageNow() : null;
      for (const q of queue) {
        if (started >= slots) break;
        if (q.ai) {
          const d = decide(q.ai, run, R);
          if (!d.ok) { waits.push(d); continue; }
          remember(run, q.what, d);
          q.go(d);
        } else q.go(null);
        started++;
      }
      if (started && run.status === "waiting") { store.setRun(run.id, { status: "running", note: null }); store.event(run.id, null, "resume", "An AI has room again: the audit carries on."); }
      if (!queue.length && !active.size) return finishRun(run, "done");
      // nothing could start and nothing is working: wait for usage, said once, retried every 5 seconds
      if (!started && !active.size && waits.length && waits.every((w) => !w.until)) {
        return finishRun(run, "stopped", `Stopped: no AI can take the rest of this run (${waits[0].why}). Change the AI settings and start again.`);
      }
      if (!started && !active.size && waits.length && run.status !== "waiting") {
        const until = waits.map((w) => w.until).filter(Boolean).sort((a, b) => a - b)[0] || null;
        const when = until ? new Date(until).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" }) : "when an AI has room";
        store.setRun(run.id, { status: "waiting", note: `${waits[0].why}. Carries on by itself ${until ? "around " + when : when}.` });
        store.event(run.id, null, "wait", `Waiting: ${waits[0].why}. It carries on by itself ${until ? "around " + when : "when an AI has room"}.`);
        if (notify && !store.get(`waitTold:${run.id}`)) store.set(`waitTold:${run.id}`, true), notify(`Audit run ${run.n} is waiting for usage`, `${waits[0].why}. It carries on by itself ${until ? "around " + when : "when an AI has room"}.`);
      }
    } catch (e) {
      // The pump runs on a timer inside the Control Room: an error here must never take the whole page server down.
      log(`AUDIT pump error: ${e.stack || e.message}`);
      try { const r = store.latestRun(); if (r) store.event(r.id, null, "fail", `The audit hit an internal error and carried on: ${String(e.message).slice(0, 200)}`); } catch {}
    } finally { pumping = false; }
  }

  function finishRun(run, status, note = null) {
    if (stopApp) { stopApp(); stopApp = null; secrets = null; }
    // the run's own copy of the platform is thrown away once nothing in the run needs it
    if (run.scope?.checkout) setTimeout(() => { try { removeCheckout(REPO, run.scope.checkout); } catch {} }, 5000).unref?.();
    store.setRun(run.id, { status, ended_at: new Date().toISOString(), note });
    const f = store.findings(run.id);
    const n = (s) => f.filter((x) => x.status === s).length;
    store.event(run.id, null, "end", `Run ${run.n} ${status}: ${f.length} found, ${n("confirmed") + n("probable")} passed the second check, ${n("rejected")} rejected, ${n("duplicate")} already on the roadmap.${note ? " " + note : ""}`);
    log(`AUDIT run ${run.n} ${status}`);
    // tell his phone (plan §11): what is waiting for him now, launch blockers first
    if (notify && !run.scope?.recheck && S().notifyRunEnd !== false) {
      const waiting = store.findings().filter((x) => ["probable", "confirmed"].includes(x.status));
      const blockers = waiting.filter((x) => x.severity === "blocker").length;
      notify(`Audit run ${run.n} ${status === "done" ? "finished" : "stopped"}`,
        waiting.length ? `${waiting.length} finding${waiting.length === 1 ? "" : "s"} wait for your yes${blockers ? `, ${blockers} of them launch blocker${blockers === 1 ? "" : "s"}` : ""}.` : "Nothing new waits for you.");
    }
  }

  // ── controls ──
  // Most valuable first (review 2026-10-20): the limit then buys the squares that matter most.
  const KIND_ORDER = ["security", "code", "backend", "integrations", "product", "looks"];
  let starting = false;
  async function start({ areas, kinds, title, journeys = true, depth = null } = {}) {
    depth = CH.DEPTHS[depth] ? depth : AI().depth in CH.DEPTHS ? AI().depth : "medium";
    if (starting) return { ok: false, said: "An audit is already starting." };   // a double tap, or Start meeting the 3 am pass
    const cur = store.latestRun();
    if (cur && ["running", "paused", "waiting"].includes(cur.status)) return { ok: false, said: `Run ${cur.n} is still ${cur.status}. Stop it first.` };
    const A = (areas && areas.length ? areas : ["Booking", "Money"]);
    const K = (Array.isArray(kinds) ? kinds : ["security", "code"]).slice().sort((a, b) => KIND_ORDER.indexOf(a) - KIND_ORDER.indexOf(b));   // [] = no AI checks (the nightly pass)
    // "Audit while the belt works" only matters for runs that use AI: free runs never wait for the belt
    if (K.length && S().withBelt === false && beltBusy()) return { ok: false, said: "The belt is running and \"Run AI audits while the belt works\" is off in Settings. Stop the belt, or switch that on." };
    starting = true;
    try {
      // the audit's own copy of the platform at its committed HEAD: what is tested is exactly that commit
      if (stopApp) { stopApp(); stopApp = null; }
      let co = null;
      // under the jobs folder's own "audit" subfolder: the belt's leftover-folder check never lists it
      try { co = prepareCheckout(REPO, checkoutDir || path.join(jobsRoot, "audit", `platform-${tag}`)); }
      catch (e) { return { ok: false, said: `Could not make the audit's copy of the platform: ${String(e.message).slice(0, 200)}` }; }
      try { await buildMap(store, { repo: co.dir }); } catch (e) { log(`AUDIT map: ${e.message}`); }
      // staging must run exactly this commit before anything is tested on it (plan §15.9)
      const usesStaging = journeys || K.includes("looks");
      let synced = null;
      if (usesStaging) {
        try { synced = await sync({ repo: co.dir, envRepo: REPO, log }); } catch (e2) { synced = { ok: false, said: `Staging could not be updated: ${e2.message}` }; }
        if (!synced.ok) return { ok: false, said: `${synced.said} Nothing was started: testing an out-of-date staging copy would give false results.` };
      }
      const run = store.newRun({ title: title || `${K.length ? CH.DEPTHS[depth].label + ": " : ""}${A.join(", ")}`, scope: { areas: A, checkout: co.dir, depth }, kinds: K, git_sha: co.sha, cap_usd: Number(S().capUsd) || null });
      // free work first (screenshots, journeys), then AI squares by value across all chosen areas
      if (usesStaging) for (const a of A) store.addCell({ run_id: run.id, area: a, kind: `capture:${a}`, role: "capture", model: "browser", id: `${run.id}:capture:${a}` });
      if (journeys) {
        for (const j of JOURNEYS.filter((x) => A.includes(x.area))) store.addCell({ run_id: run.id, area: j.area, kind: `journey:${j.id}`, role: "journey", model: "script", id: `${run.id}:journey:${j.id}` });
        const skip = SKIPPED.filter((s) => A.includes(s.area));
        const refs = skip.map((s) => { let src = []; try { src = readFileSync(path.join(co.dir, "scripts", s.script), "utf8").split("\n"); } catch {} const n = src.findIndex((l) => l.includes(s.pattern) && !/^\s*\/\//.test(l)); return n >= 0 ? `scripts/${s.script}:${n + 1}` : null; }).filter(Boolean);
        const skey = `skip|journeys|${skip.map((s) => s.script).sort().join(",")}`;
        if (refs.length && !store.findingByKey(skey)) store.addFinding({ fkey: skey, run_id: run.id, category: "debt", severity: "after", areas: [...new Set(skip.map((s) => s.area))], files: refs, finder_role: "journey", finder_model: "engine",
          title: `${refs.length} end-to-end test${refs.length === 1 ? "" : "s"} cannot run on the test copy, so the audit cannot use ${refs.length === 1 ? "it" : "them"}`,
          observed: skip.map((s) => `${s.script}: ${s.why}`).join("; "), recommendation: "Read the app address from BASE (as e2e-booking.mjs does), take a --to= address for mail, and allow the staging project as well as the platform's own, so they can run on staging for free.",
          status: "confirmed", second_check: { verdict: "confirmed", by: "engine", why: "Read from the scripts themselves." } });
      }
      for (const k of K) for (const a of A) store.addCell({ run_id: run.id, area: a, kind: k, role: k, model: modelFor(k) });
      // THE AI PLANNER (his "have an AI choose"): one short call reads the knowledge notes and who has room, and suggests
      // who does each kind. The chooser still applies his limits and fixed choices; with no answer, the rules decide.
      if (K.length && AI().aiPick) {
        const plan = await planWithAI(run, A, K, depth).catch((e) => { log(`AUDIT planner: ${e.message}`); return null; });
        store.setRun(run.id, { scope: { ...store.run(run.id).scope, aiPlan: plan } });
        store.event(run.id, null, "plan", plan ? `AI plan: ${Object.entries(plan).map(([k, v]) => `${k} → ${CH.NAME[v.provider]}${v.model ? " " + v.model : ""}`).join(", ")}` : "No AI plan this time: the rules decide who does what.");
      }
      store.setRun(run.id, { status: "running", started_at: new Date().toISOString() });
      if (synced) store.event(run.id, null, "sync", synced.said);
      store.event(run.id, null, "begin", `Run ${run.n} started: ${A.join(", ")} × ${K.length ? K.join(", ") + ` (${depth})` : "screenshots and journeys only"}, commit ${co.sha}`);
      pump();
      return { ok: true, said: `Audit run ${run.n} started.`, run: run.id };
    } finally { starting = false; }
  }
  // the estimate shown beside Start (plan §15.7): measured, not guessed
  // measured squares were medium depth; quick and deep are scaled from them (an estimate, said as one)
  const DEPTH_COST = { quick: 0.4, medium: 1, deep: 2.2 };
  const estimate = (areas, kinds, depth = "medium") => { const m = depthMeasured(depth), per = m ?? avgSquareUsd() * (DEPTH_COST[depth] || 1);
    return { squares: areas * kinds, usd: Math.round(areas * kinds * per * 100) / 100, perSquare: Math.round(per * 100) / 100, capUsd: Number(S().capUsd) || null, depth }; };

  const depthMeasured = (depth) => { const v = avgSquareUsd(depth), all = avgSquareUsd(); return depth === "medium" || v !== all ? v : null; };
  function knowledge() { const k = AI().knowledge; if (k && String(k).trim()) return String(k); try { return readFileSync(path.join(HERE, "audit-knowledge.md"), "utf8"); } catch { return ""; } }
  function planWithAI(run, A, K, depth) {
    const r = usageNow(), s = AI(), now = Date.now();
    const ctx = { s, now, usage: r.usage, down: r.down };
    const rooms = CH.PROVIDERS.map((p) => ({ provider: p, ...CH.room(p, ctx) }));
    // the planner itself is a short, light call on a subscription
    const who = CH.order(s, localDay(), r.usage, now).find((p) => rooms.find((x) => x.provider === p).ok);
    if (!who) return Promise.resolve(null);
    const folder = folderFor(run, "planner"), key = `plan:${run.id}`;
    return new Promise((resolve) => {
      const t = setTimeout(() => { kill(active.get(key)?.child); resolve(null); }, 180000);
      launch(key, { provider: who, run, folder, model: who === "claude" ? "haiku" : "gpt-5.6-terra", effort: "low", tools: "Read",
        prompt: CH.plannerPrompt({ knowledge: knowledge(), kinds: K, areas: A, depth, rooms }),
        onDone: (x) => { clearTimeout(t); addCost(run, x.cost); resolve(CH.parsePlan(x.answer)); } });
    });
  }

  // DIG DEEPER: one more auditor on the same square, told to look hard at this finding.
  function dig(f) {
    const run = store.run(f.run_id);
    if (!run) return { ok: false, said: "That run is gone." };
    const c = store.cell(f.cell_id) || { area: (f.areas || [])[0] || "Booking", kind: f.finder_role || "code" };
    const id = `${run.id}:${c.area}:${c.kind}:dig-${f.id}`;
    if (store.cell(id)) return { ok: false, said: "Already digging into that one." };
    store.addCell({ run_id: run.id, area: c.area, kind: c.kind, role: c.kind, model: modelFor(c.kind), id,
      summary: JSON.stringify({ id: f.id, title: f.title, files: f.files, observed: f.observed, second_check: f.second_check }) });
    if (!["running", "paused", "waiting"].includes(run.status)) store.setRun(run.id, { status: "running", ended_at: null });
    pump();
    return { ok: true, said: "An auditor is digging into it. New findings appear here when it finishes." };
  }
  function pause() {
    const r = store.latestRun(); if (!r || !["running", "waiting"].includes(r.status)) return { ok: false, said: "Nothing is running." };
    store.setRun(r.id, { status: "paused" });
    return { ok: true, said: "Paused. Auditors already working finish their square; nothing new starts." };
  }
  function resume() {
    const r = store.latestRun(); if (!r || r.status !== "paused") return { ok: false, said: "Nothing is paused." };
    store.setRun(r.id, { status: "running" }); pump();
    return { ok: true, said: "Carrying on." };
  }
  function stop() {
    const r = store.latestRun(); if (!r || !["running", "paused", "waiting"].includes(r.status)) return { ok: false, said: "Nothing is running." };
    store.setRun(r.id, { status: "stopped", ended_at: new Date().toISOString(), note: "Stopped by Andrew." });
    for (const a of active.values()) kill(a.child);
    abort.abort(); abort = new AbortController();
    if (stopApp) { stopApp(); stopApp = null; }
    // a stopped re-check run: what it never reached goes back to waiting, so it is tried again later
    for (const id of r.scope?.recheck || []) { const f = store.finding(id); if (f?.status === "fixed") store.setFinding(id, { status: "sent" }); }
    return { ok: true, said: "Stopped. What was already found is kept." };
  }
  // After a restart: interrupted work goes back in the queue (the store is the checkpoint).
  function recover() {
    const r = store.latestRun();
    if (!r) return;
    if (r.status === "planned") { store.setRun(r.id, { status: "failed", ended_at: new Date().toISOString(), note: "The Control Room restarted while this run was being planned. Start it again." }); return; }
    for (const c of store.cells(r.id)) if (c.status === "running") store.setCell(c.id, { status: "todo", step: null });
    for (const f of store.findings(r.id)) if (f.status === "checking") store.setFinding(f.id, { status: "unverified" });
  }

  if (!preview) { recover(); timer = setInterval(pump, 5000); timer.unref?.(); }
  return { start, estimate, avgSquareUsd, depthMeasured, usageNow, knowledge, dig, recheck, tickedSent, pause, resume, stop, pump, active: () => active.size, close: () => clearInterval(timer) };
}
