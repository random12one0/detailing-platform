// ===========================================================================
// AUDIT — the Control Room's Audit tab: server side.
// ===========================================================================
//
// Andrew, 2026-10-15: "the belt is for completing the roadmap, and the audit is
// for adding to the roadmap" … "a full test of everything … so nothing slips
// through" … "it should be the laptop version … then when audits pass and fixed
// we upload live". Plan: audit-tab/PLAN.md. Staging: audit-tab/STAGING.md.
//
// dashboard.mjs hands every /api/audit/* and /audit/* request here (one line in
// its router, behind its lock), so this file owns the tab end to end and the
// 6,000-line dashboard only knows it exists.
//
// Store: data/audit/audit.db (BELT_AUDIT_DB overrides it, which is how the
// preview and the layout checker run on a sample database).

import { REPO_ROOT } from "./paths.mjs";
import { readFileSync } from "node:fs";
import path from "node:path";
import { openStore, AREAS, KINDS, SEVERITIES } from "./audit-store.mjs";
import { createEngine } from "./audit-engine.mjs";
import { readStream, plainStep } from "./lib.mjs";
import { sendToIssue } from "./audit-issues.mjs";
import { liveBundle, liveCheck } from "./audit-live.mjs";
import { stagingSecretNames } from "./audit-journeys.mjs";
import * as CH from "./audit-chooser.mjs";
const FIXED_CHOICES = CH.FIXED.map((f) => ({ id: f.id, label: f.label }));

// Settings rows (plan §7, §9, §14). Shown by the dashboard's Settings page under
// "Audit"; every behaviour that can be tuned is here, not hard-coded
// (Andrew, 2026-10-12: "everything that can be switched should be able to be
// switched in Settings").
export const AUDIT_SETTINGS = [
  // Only settings that DO something are listed (review 2026-10-20: four did nothing and were removed;
  // they come back when they are built).
  { path: "audit.capUsd", kind: "money", min: 1, max: 200, step: 1, default: 25, recommend: 25, group: "audit",
    label: "Spending limit per audit run ($)",
    why: "Nothing new starts once a run could go past this. What it found so far is kept. The Start button shows an estimate before you press it." },
  { path: "audit.parallel", kind: "int", min: 1, max: 6, default: 2, recommend: 2, group: "audit",
    label: "Auditors working at once", why: "More finishes sooner but uses your plan faster. Two is a good balance on this laptop." },
  { path: "audit.withBelt", kind: "bool", default: true, recommend: true, group: "audit",
    label: "Run AI audits while the belt is working",
    why: "On: an audit can start any time; it tests its own copy of the platform, so it never gets in the belt's way. Off: an audit that uses AI only starts when the belt is stopped. Free checks (the nightly pass, re-checks, the live-site check) always run." },
  // ── THE AI CHOOSER (2026-10-22): shown on the Audit tab's "AI & limits" view, not the main Settings page ──
  { path: "audit.ai.depth", kind: "choice", group: "audit", sub: "ai", default: "medium", recommend: "medium",
    options: [{ id: "quick", label: "Quick" }, { id: "medium", label: "Medium" }, { id: "deep", label: "Deep" }],
    label: "Usual depth of an audit", why: "Quick: middle-strength AIs, medium effort, the top 4 problems per square, about 40% of the cost. Medium: the normal audit. Deep: the strongest AIs at the highest effort, up to 15 problems per square, about twice the cost. You can pick another depth each time you press Start." },
  { path: "audit.ai.claude", kind: "bool", group: "audit", sub: "ai", default: true, recommend: true, label: "Claude may audit", why: "Off: Claude is never used for audits." },
  { path: "audit.ai.codex", kind: "bool", group: "audit", sub: "ai", default: true, recommend: true, label: "ChatGPT may audit", why: "Off: ChatGPT is never used for audits." },
  { path: "audit.ai.prefer", kind: "choice", group: "audit", sub: "ai", default: "auto", recommend: "auto",
    options: [{ id: "auto", label: "Decide from my plans" }, { id: "claude", label: "Claude first" }, { id: "codex", label: "ChatGPT first" }],
    label: "Which AI goes first", why: "Decide from my plans: Claude while your Max plan lasts, then ChatGPT. If one AI is far more used than the other subscription (20 points), the one with more left goes first." },
  { path: "audit.ai.aiPick", kind: "bool", group: "audit", sub: "ai", default: true, recommend: true, label: "Let an AI plan who does what",
    why: "At the start of each audit, one short call (Claude Haiku or ChatGPT Terra) reads the notes below and who has room, and suggests which AI does each kind of check. Your limits and fixed choices always win. Off: the rules alone decide." },
  { path: "audit.ai.crossCheck", kind: "bool", group: "audit", sub: "ai", default: true, recommend: true, label: "Second check by a different AI company",
    why: "Each finding is checked by another company's AI when one has room (Claude's finding checked by ChatGPT, and the other way round). Off, or when none has room: a different model from the same company." },
  { path: "audit.ai.claudeMaxUntil", kind: "date", group: "audit", sub: "plans", default: "2026-10-25", allowEmpty: true, label: "Claude Max plan ends", why: "Until this day Claude goes first. Empty: Claude is not preferred." },
  { path: "audit.ai.chatgptFreeUntil", kind: "date", group: "audit", sub: "plans", default: "2027-01-03", allowEmpty: true, label: "ChatGPT free plan ends", why: "After this day ChatGPT goes last." },
  { path: "audit.ai.claudeStop5h", kind: "int", group: "audit", sub: "limits", min: 10, max: 100, default: 90, recommend: 90, label: "Claude: stop new audit work at % of the 5-hour window", why: "New audit work waits once Claude's 5-hour window passes this. It carries on by itself when the window resets. 100 = never stop early." },
  { path: "audit.ai.claudeStopWeek", kind: "int", group: "audit", sub: "limits", min: 10, max: 100, default: 80, recommend: 80, label: "Claude: stop new audit work at % of the week", why: "The same for the weekly window." },
  { path: "audit.ai.codexStop5h", kind: "int", group: "audit", sub: "limits", min: 10, max: 100, default: 90, recommend: 90, label: "ChatGPT: stop new audit work at % of the 5-hour window", why: "New audit work waits once ChatGPT's 5-hour window passes this, and carries on by itself when it resets." },
  { path: "audit.ai.codexStopWeek", kind: "int", group: "audit", sub: "limits", min: 10, max: 100, default: 80, recommend: 80, label: "ChatGPT: stop new audit work at % of the week", why: "The same for the weekly window." },
  { path: "audit.ai.finishFrom", kind: "int", group: "audit", sub: "limits", min: 0, max: 100, default: 80, recommend: 80, label: "Let a run this % done finish past the stop lines",
    why: "A run that is at least this far along finishes even past your stop lines (a real out-of-limit still stops it). 0 = never." },
  { path: "audit.ai.staleMin", kind: "int", group: "audit", sub: "limits", min: 5, max: 600, default: 30, recommend: 30, label: "Trust a usage reading for (minutes)",
    why: "An older reading counts as unknown, not as full: the next answer from that AI brings a fresh one, and a real out-of-limit is always caught." },
  ...["security", "code", "backend", "integrations", "product", "looks", "check"].map((k) => ({
    path: `audit.ai.kind.${k}`, kind: "choice", group: "audit", sub: "fixed", default: "auto", recommend: "auto", options: FIXED_CHOICES,
    label: { security: "Safety checks", code: "Code checks", backend: "Data checks", integrations: "Links checks", product: "Product checks", looks: "Looks checks", check: "Second checks" }[k],
    why: "Let the chooser decide, or always use one AI for this kind. A fixed AI that is out of room makes its jobs wait rather than switch." })),
  { path: "audit.ai.knowledge", kind: "text", group: "audit", sub: "notes", maxLen: 20000, rows: 16, allowEmpty: true, default: "",
    label: "What the AI planner knows (your plans, the models, lessons)", why: "Empty: the notes that come with the Control Room (audit-knowledge.md) are used. Edit to teach the planner; your limits above always win." },
  { path: "audit.autoRecheck", kind: "bool", default: true, recommend: true, group: "audit",
    label: "Re-check items the belt ticks", why: "When the belt ticks an audit item on the roadmap, check the problem is really gone. If it is not, your phone is told." },
  { path: "audit.nightly", kind: "bool", default: true, recommend: true, group: "audit",
    label: "Free nightly check at 3 am", why: "Screenshots of every screen and every customer journey on the test copy, no AI cost. Runs if the laptop is on, and keeps the free test copy from going to sleep." },
  { path: "audit.postPublish", kind: "bool", default: true, recommend: true, group: "audit",
    label: "Check the live site after each publish", why: "Opens the main pages and reads them. Nothing is typed, pressed or recorded on the live site." },
  { path: "audit.notifyRunEnd", kind: "bool", default: true, recommend: true, group: "audit",
    label: "Tell my phone when an audit finishes", why: "Says how many findings wait for your yes, and how many are launch blockers." },
  { path: "audit.guidance", kind: "text", group: "audit", maxLen: 4000, rows: 6,
    default: "Prove every finding with a file and line, a screenshot, a test result or a database read. Say plainly what you could not check. Do not suggest a change just because another way exists: name the benefit, the effort and the risk. Phones first.",
    label: "Guidance every auditor reads", why: "Lessons for the auditors, in plain words. Edit to teach them." },
];

const DIMENSIONS = [
  "Functional correctness", "Data integrity", "Security", "Reliability", "Integrations", "Performance",
  "Accessibility", "User experience", "Visual quality", "Maintainability", "Feature completeness",
  "Test coverage", "Deploy readiness",
];

const STATIC = {
  "/audit/ui.js": ["audit-ui.js", "text/javascript; charset=utf-8"],
  "/audit/ui.css": ["audit-ui.css", "text/css; charset=utf-8"],
};

export function createAudit({ HERE, C = {}, json, body, log = () => {}, L = {}, preview = false, beltBusy = () => false, talk = null, notify = null }) {
  const file = process.env.BELT_AUDIT_DB || path.join(HERE, "data", "audit", "audit.db");
  const store = openStore(file);
  // The code under test is the laptop checkout of the platform (plan §6).
  const REPO = process.env.AUDIT_REPO || C.repo || REPO_ROOT;
  const engine = createEngine({ store, HERE, REPO, C, beltBusy, log, readStream, plainStep, preview, notify });
  const evidenceRoot = path.join(path.dirname(file), "evidence");

  function overview(runId) {
    const sum = store.summary(runId || null);
    const runs = store.runs();
    const bench = store.get("bench");
    const all = store.findings();
    const judged = all.filter((f) => ["confirmed", "probable", "disputed", "rejected", "sent", "fixed", "rechecked", "dismissed"].includes(f.status));
    const overturned = all.filter((f) => f.status === "rejected" || f.status === "dismissed").length;
    const confirmedCost = (() => {
      const n = all.filter((f) => ["confirmed", "sent", "fixed", "rechecked"].includes(f.status)).length;
      const usd = runs.reduce((a, r) => a + (r.cost_usd || 0), 0);
      return n ? usd / n : null;
    })();
    return {
      ...sum, areas: AREAS, kinds: KINDS, severities: SEVERITIES, runs: runs.slice(0, 20),
      quality: {
        bench, // { caught, of, at }
        falseAlarm: judged.length ? { overturned, of: judged.length } : null,
        costPerConfirmed: confirmedCost,
      },
      publish: store.get("publish"), // { ready, sha, at, blockers }
      live: store.get("liveCheck"),
      settings: C.audit || {},
      perSquareUsd: engine.avgSquareUsd(),
      // what one square costs at each depth: measured when that depth has run, else scaled from all runs (and the page says which)
      depthUsd: Object.fromEntries(["quick", "medium", "deep"].map((d) => { const m = engine.depthMeasured(d); return [d, m != null ? { usd: m, measured: true } : { usd: engine.avgSquareUsd() * ({ quick: 0.4, medium: 1, deep: 2.2 })[d], measured: false }]; })),
      depth: CH.settingsOf(C.audit || {}).depth,
    };
  }

  // Which kinds of check stand behind each readiness dimension (plan §10). No invented
  // scores: per area, the LATEST square of those kinds is tested or not, and passed only
  // if no open problem came out of it. Untested squares are counted as unknown.
  const DIM_KINDS = {
    "Functional correctness": ["code", "journey"], "Data integrity": ["backend"], "Security": ["security"],
    "Reliability": ["integrations", "journey"], "Integrations": ["integrations"], "Performance": ["performance"],
    "Accessibility": ["capture"], "User experience": ["looks", "product"], "Visual quality": ["looks", "capture"],
    "Maintainability": ["code"], "Feature completeness": ["product"], "Test coverage": ["journey"], "Deploy readiness": ["live"],
  };
  const OPEN = ["probable", "confirmed", "sent", "fixed"];
  const kindOf = (c) => c.kind.startsWith("journey:") ? "journey" : c.kind.startsWith("capture:") ? "capture" : c.kind;
  function computeDimensions() {
    const runs = store.runs().slice().reverse();               // oldest first, so later runs win
    const latest = new Map();                                 // "area|kind|journeyId" -> cell
    for (const r of runs) for (const c of store.cells(r.id)) {
      if (c.kind.startsWith("recheck:") || c.id.includes(":dig-")) continue;
      latest.set(`${c.area}|${c.kind}`, c);
    }
    const findings = store.findings();
    const openFrom = (cellId) => findings.some((f) => f.cell_id === cellId && OPEN.includes(f.status));
    const live = store.get("liveCheck");
    const out = {};
    for (const [name, kinds] of Object.entries(DIM_KINDS)) {
      if (kinds.includes("live")) { out[name] = live ? { tested: live.pages.length, passed: live.pages.filter((p) => p.ok).length, failed: live.pages.filter((p) => !p.ok).length, unknown: 0 } : { tested: 0, passed: 0, failed: 0, unknown: null }; continue; }
      const cells = [...latest.values()].filter((c) => kinds.includes(kindOf(c)));
      const done = cells.filter((c) => ["clean", "findings"].includes(c.status));
      const failed = done.filter((c) => openFrom(c.id)).length;
      const possible = kinds.reduce((n, k) => n + (k === "journey" ? cells.filter((c) => kindOf(c) === "journey").length : AREAS.length), 0);
      out[name] = { tested: done.length, passed: done.length - failed, failed, unknown: Math.max(0, possible - done.length) };
    }
    return out;
  }
  // Outside services the map DISCOVERED (plan §9), with whether staging can test them.
  // words that tie a finding to a service (review: "phone" matched every phone-width finding)
  const SERVICE_WORDS = { Stripe: /stripe|deposit|payment|webhook|subscription|refund/i, "Email (Resend)": /e-?mail|resend|inbox/i,
    "Addresses (Geoapify)": /address|geoapify|geocod/i, "Photos (Cloudflare R2)": /photo|upload|r2|gallery/i, "Translation (DeepL)": /translat|deepl/i,
    "Translation (Google)": /translat/i, "Phone alerts (web push)": /push notification|web push|vapid|phone alert/i, "Google Business": /google business|google profile/i };
  const SERVICE_KEYS = { Stripe: /^STRIPE_/, "Email (Resend)": /^RESEND_/, "Addresses (Geoapify)": /^GEOAPIFY_/, "Photos (Cloudflare R2)": /^R2_/,
    "Translation (DeepL)": /^DEEPL_/, "Translation (Google)": /^GOOGLE_TRANSLATE/, "Phone alerts (web push)": /^OWNER_VAPID_/, "Google Business": /^GOOGLE_BUSINESS/ };
  function integrations(secretNames) {
    const items = store.mapItems();
    const keys = items.filter((i) => i.type === "key").map((i) => i.name);
    const hosts = items.filter((i) => i.type === "service");
    const fs = store.findings().filter((f) => OPEN.includes(f.status));
    const out = [];
    for (const [name, re] of Object.entries(SERVICE_KEYS)) {
      const k = keys.filter((x) => re.test(x));
      if (!k.length) continue;
      const have = secretNames ? k.filter((x) => secretNames.includes(x)) : null;
      const probs = fs.filter((f) => SERVICE_WORDS[name]?.test(`${f.title} ${f.observed || ""}`)).length;
      out.push({ name, mode: name.startsWith("Email") ? "checked from the database, never sent (shared allowance)" : have == null ? "unknown" : have.length === k.length ? "set up on staging" : "missing on staging",
        health: probs ? "bad" : have && have.length === k.length ? "ok" : "unknown", features: k, covered: probs ? `${probs} open problem${probs === 1 ? "" : "s"}` : "" });
    }
    // links the product shows customers (Cash App, Venmo, PayPal.me, a map link) are not services it calls
    for (const h of hosts) if (!/cash\.app|venmo\.com|paypal\.me|openstreetmap\.org|geoapify\.com$/.test(h.name) && !out.some((o) => new RegExp(h.name.split(".").slice(-2, -1)[0] || "zzz", "i").test(o.name)))
      out.push({ name: h.name, mode: "called directly, no key", health: "unknown", features: (h.meta?.files || []).slice(0, 3), covered: "" });
    return out;
  }
  let secretCache = null, secretAt = 0;
  async function readiness() {
    const f = store.findings().filter((x) => !["rejected", "dismissed", "duplicate"].includes(x.status));
    const open = f.filter((x) => !["fixed", "rechecked"].includes(x.status));
    const dims = store.get("dimensions") || computeDimensions();   // the sample database pins its own
    if (!preview && Date.now() - secretAt > 10 * 60000) { secretCache = await stagingSecretNames(REPO).catch(() => null); secretAt = Date.now(); }
    return {
      blockers: open.filter((x) => x.severity === "blocker").map(pick),
      before: open.filter((x) => x.severity === "before").length,
      dimensions: DIMENSIONS.map((name) => ({ name, ...(dims[name] || { tested: 0, passed: 0, failed: 0, unknown: null }) })),
      integrations: store.get("integrations") || integrations(secretCache),
      live: store.get("liveCheck"),
    };
  }
  const pick = (x) => ({ id: x.id, title: x.title, severity: x.severity, status: x.status, areas: x.areas, roadmap_id: x.roadmap_id });

  function mapInfo() {
    const items = store.mapItems();
    const byArea = {};
    for (const it of items) {
      const a = (byArea[it.area] ||= { area: it.area, total: 0, types: {} });
      a.total++; a.types[it.type] = (a.types[it.type] || 0) + 1;
    }
    return { total: items.length, areas: Object.values(byArea), flows: items.filter((i) => i.type === "flow"), checked: store.get("mapCheck") };
  }

  function costs() {
    const cells = store.runs().flatMap((r) => store.cells(r.id));
    const by = (key) => {
      const o = {};
      for (const c of cells) { const k = c[key] || "?"; (o[k] ||= { key: k, usd: 0, cells: 0 }); o[k].usd += c.cost_usd || 0; o[k].cells++; }
      return Object.values(o).sort((a, b) => b.usd - a.usd);
    };
    const f = store.findings();
    const accuracy = {};
    for (const x of f) {
      const k = x.finder_model || "?";
      const a = (accuracy[k] ||= { model: k, found: 0, upheld: 0, overturned: 0 });
      a.found++;
      if (["confirmed", "probable", "sent", "fixed", "rechecked"].includes(x.status)) a.upheld++;
      if (["rejected", "dismissed"].includes(x.status)) a.overturned++;
    }
    // second checks are paid per finding, not per square: shown as their own row so the totals add up
    const checks = f.reduce((a, x) => a + (x.cost_usd || 0), 0);
    const byRole = by("role"); if (checks) byRole.push({ key: "findingcheck", usd: checks, cells: f.filter((x) => x.cost_usd).length });   // R3 N3-P2-9: the second opinions on findings, not the "check" squares
    return { byRole, byModel: by("model"), accuracy: Object.values(accuracy) };
  }

  // WHO HAS ROOM, for the "AI & limits" view: the same readings the chooser uses, and its last decisions
  function aiStatus() {
    const s = CH.settingsOf(C.audit || {}), now = Date.now();
    const r = engine.usageNow();   // read-only, so a preview shows the real readings too
    const ctx = { s, now, usage: r.usage, down: r.down, progress: 0 };
    const providers = CH.PROVIDERS.map((p) => {
      const u = r.usage?.[p] || null, pr = CH.pressure(u, s, now), rm = CH.room(p, ctx);
      return { provider: p, name: CH.NAME[p], allowed: !!s[p], ok: rm.ok, why: rm.why, until: rm.until || null,
        fiveHour: pr?.fiveHour ?? null, week: pr?.week ?? null, at: u?.at || null, stale: pr ? pr.stale : null,
        // reset times only from a reading still trusted, and only ones still ahead
        resets: u && !pr?.stale ? { fiveHour: u.fiveHour?.resetsAt * 1000 > now ? u.fiveHour.resetsAt * 1000 : null, week: u.week?.resetsAt * 1000 > now ? u.week.resetsAt * 1000 : null } : null };
    });
    return { providers,
      order: CH.order(s, (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; })(), r.usage, now).map((p) => CH.NAME[p]), choices: store.get("aiChoices") || [], depth: s.depth,
      knowledgeDefault: (() => { try { return readFileSync(path.join(HERE, "audit-knowledge.md"), "utf8"); } catch { return ""; } })() };
  }

  function sendFile(res, abs, type) {
    try {
      const buf = readFileSync(abs);
      res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
      res.end(buf);
    } catch { json(res, 404, { ok: false }); }
  }

  // ── POST actions on a finding (chunk 1: the ones that only change the store) ──
  function act(b) {
    const f = store.finding(String(b.id || ""));
    if (!f) return { ok: false, said: "That finding is not in the audit any more." };
    if (b.action === "dismiss") {
      store.setFinding(f.id, { status: "dismissed", user_note: String(b.note || "").slice(0, 2000) || null });
      return { ok: true, said: `${f.id} marked not a problem.` };
    }
    if (b.action === "note") {
      store.setFinding(f.id, { user_note: String(b.note || "").slice(0, 2000) });
      return { ok: true, said: "Note saved." };
    }
    if (b.action === "undo" && ["dismissed"].includes(f.status)) {
      store.setFinding(f.id, { status: f.second_check?.verdict || "probable" });
      return { ok: true, said: `${f.id} is back in your list.` };
    }
    if (b.action === "send") {
      if (!["confirmed", "probable"].includes(f.status)) return { ok: false, said: `${f.id} has not passed its second check, so it cannot become an issue.` };
      if (preview) return { ok: false, said: "This is a preview copy: no GitHub issue is created." };
      return sendToIssue(store, f, { repo: REPO })
        .catch((e) => ({ ok: false, said: "Could not create the GitHub issue: " + String(e.message).slice(0, 200) }));
    }
    if (b.action === "dig") return preview ? { ok: false, said: "This is a preview copy." } : engine.dig(f);
    if (b.action === "talk") {
      if (!talk) return { ok: false, said: "Planning is not available here." };
      const about = [f.title, f.observed && "What happens: " + f.observed, f.implemented && "What the code does: " + f.implemented,
        (f.files || []).length && "Where: " + f.files.join(", "), f.second_check?.why && "Second check: " + f.second_check.why, f.recommendation && "Suggested fix: " + f.recommendation].filter(Boolean).join("\n");
      return talk({ title: `Audit ${f.id}: ${f.title}`.slice(0, 160), about });
    }
    return { ok: false, said: "That button is not wired up yet. It comes with the audit engine." };
  }

  function handle(req, res, url) {
    const p = url.pathname;
    if (STATIC[p]) { const [f, t] = STATIC[p]; return sendFile(res, path.join(HERE, f), t), true; }
    if (p.startsWith("/audit/evidence/")) {
      const rel = decodeURIComponent(p.slice("/audit/evidence/".length));
      if (!/^[a-z0-9-]+\/[a-z0-9][a-z0-9._-]*\.(png|jpe?g|webp|json|txt|zip)$/i.test(rel)) return json(res, 404, { ok: false }), true;
      const ext = rel.split(".").pop().toLowerCase();
      const type = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", json: "application/json", txt: "text/plain; charset=utf-8", zip: "application/zip" }[ext];
      return sendFile(res, path.join(evidenceRoot, rel), type), true;
    }
    if (!p.startsWith("/api/audit")) return false;
    const q = url.searchParams;
    if (req.method === "GET") {
      if (p === "/api/audit/overview") return json(res, 200, overview(q.get("run"))), true;
      if (p === "/api/audit/findings") {
        const runId = q.get("run") || store.latestRun()?.id;
        return json(res, 200, { findings: runId ? store.findings(runId) : [], all: q.get("all") ? store.findings() : undefined }), true;
      }
      if (p === "/api/audit/finding") {
        const f = store.finding(q.get("id") || "");
        return json(res, f ? 200 : 404, f ? { finding: f, evidence: store.evidenceFor(f.id) } : { ok: false }), true;
      }
      if (p === "/api/audit/cell") {
        const c = store.cell(q.get("id") || "");
        return json(res, c ? 200 : 404, c ? { cell: c, evidence: store.evidenceForCell(c.id), findings: store.findings(c.run_id).filter((f) => f.cell_id === c.id).map(pick) } : { ok: false }), true;
      }
      if (p === "/api/audit/events") {
        const runId = q.get("run") || store.latestRun()?.id;
        return json(res, 200, { events: runId ? store.events(runId, Number(q.get("after") || 0)) : [] }), true;
      }
      if (p === "/api/audit/readiness") { readiness().then((r) => json(res, 200, r)).catch((e) => json(res, 500, { ok: false, said: e.message })); return true; }
      if (p === "/api/audit/map") return json(res, 200, mapInfo()), true;
      if (p === "/api/audit/journeys") return json(res, 200, { journeys: store.journeys() }), true;
      if (p === "/api/audit/costs") return json(res, 200, costs()), true;
      if (p === "/api/audit/ai") return json(res, 200, aiStatus()), true;
      if (p === "/api/audit/shots") {
        const runId = q.get("run") || store.latestRun()?.id;
        const shots = runId ? store.db.prepare("select * from evidence where run_id = ? and kind = 'shot' order by id desc limit 200").all(runId) : [];
        return json(res, 200, { shots }), true;
      }
      return json(res, 404, { ok: false }), true;
    }
    if (req.method === "POST") {
      if (p === "/api/audit/act") return body(req, res, 8000, (b) => Promise.resolve(act(b)).then((r) => json(res, 200, r)).catch((e) => json(res, 200, { ok: false, said: e.message }))), true;
      if (p === "/api/audit/start") return body(req, res, 4000, async (b) => {
        const areas = (Array.isArray(b.areas) ? b.areas : []).filter((a) => AREAS.includes(a));
        const kinds = (Array.isArray(b.kinds) ? b.kinds : []).filter((k) => KINDS.some((x) => x.id === k));
        const depth = CH.DEPTHS[b.depth] ? b.depth : null;
        try { json(res, 200, await engine.start({ areas, kinds, depth })); } catch (e) { json(res, 200, { ok: false, said: "Could not start: " + e.message }); }
      }), true;
      if (p === "/api/audit/pause") return json(res, 200, engine.pause()), true;
      if (p === "/api/audit/resume") return json(res, 200, engine.resume()), true;
      if (p === "/api/audit/stop") return json(res, 200, engine.stop()), true;
      // ASK THE LEAD (plan §11.12): the run, its findings and its gaps become a Planning topic he can talk through.
      if (p === "/api/audit/ask") return body(req, res, 2000, (b) => {
        const run = store.run(String(b.run || "")) || store.latestRun();
        if (!run || !talk) return json(res, 200, { ok: false, said: "Planning is not available here." });
        const fs2 = store.findings(run.id).filter((f) => !["rejected", "dismissed"].includes(f.status));
        const cells = store.cells(run.id);
        const notDone = cells.filter((c) => !["clean", "findings"].includes(c.status));
        const about = [
          `Audit run ${run.n}: ${run.title}. Tested commit ${run.git_sha || "?"} on the staging copy. Status ${run.status}, cost $${(run.cost_usd || 0).toFixed(2)}.`,
          `Squares: ${cells.length - notDone.length} done of ${cells.length}; not done: ${notDone.map((c) => `${c.area} × ${c.kind} (${c.status}${c.summary ? ": " + c.summary.slice(0, 120) : ""})`).join("; ") || "none"}.`,
          "Findings:",
          ...fs2.map((f) => `- ${f.id} [${f.status}${f.roadmap_id ? ", roadmap " + f.roadmap_id : ""}] ${f.severity}: ${f.title}${(f.files || []).length ? " (" + f.files.slice(0, 3).join(", ") + ")" : ""}`),
          "Full evidence is in the Control Room audit database; findings that went on the roadmap have a report in docs/audits/.",
        ].join("\n");
        json(res, 200, talk({ title: `Audit run ${run.n}: ${run.title}`.slice(0, 160), about: about.slice(0, 12000) }));
      }), true;
      if (p === "/api/audit/recheck") { engine.recheck().then((r) => json(res, 200, r)).catch((e) => json(res, 200, { ok: false, said: e.message })); return true; }
      if (p === "/api/audit/livecheck") {
        if (preview) return json(res, 200, { ok: false, said: "This is a preview copy." }), true;
        liveCheck().then((r) => { store.set("liveCheck", r); json(res, 200, { ok: true, said: r.ok ? "The live site looks right." : "The live site has a problem: see Readiness." }); })
          .catch((e) => json(res, 200, { ok: false, said: "Could not reach the live site: " + e.message }));
        return true;
      }
      return json(res, 404, { ok: false }), true;
    }
    return false;
  }

  // ── THE SCHEDULE (plan §15.6), every 5 minutes while the Control Room runs ──
  //   live check after a publish · re-check what the belt ticked · nightly 3 am pass
  // Each is a Settings switch; nothing here starts or stops the belt.
  let busy = false;
  async function tick() {
    if (busy || preview) return;
    busy = true;
    try {
      const s = C.audit || {};
      if (s.postPublish !== false) {
        const bundle = await liveBundle().catch(() => null);
        const last = store.get("liveCheck");
        // a new publish, or one failed look at this publish not yet retried (a hotspot blip must not raise a false alarm)
        const retry = last && last.bundle === bundle && !last.ok && !last.retried && Date.now() - Date.parse(last.at) > 4 * 60000;
        if (bundle && (!last || last.bundle !== bundle || retry)) {
          const r = await liveCheck().catch((e) => ({ at: new Date().toISOString(), bundle, ok: false, pages: [], error: e.message }));
          store.set("liveCheck", { ...r, retried: !!retry });
          log(`AUDIT live check after publish: ${r.ok ? "ok" : retry ? "PROBLEM (second look)" : "problem, looking again in 5 minutes"}`);
          if (!r.ok && retry && notify) notify("The live site has a problem after the last publish", "Seen twice, 5 minutes apart. Open the Audit tab, Readiness, to see which page.");
        }
      }
      if (s.autoRecheck !== false && engine.tickedSent().length) await engine.recheck();
      const now = new Date(), today = now.toISOString().slice(0, 10);
      if (s.nightly !== false && now.getHours() === 3 && store.get("nightlyAt") !== today) {
        // marked done only when it really started: a refusal (belt busy, a run going) retries every 5 minutes until 4 am
        const r = await engine.start({ areas: AREAS, kinds: [], title: "Nightly: screenshots and journeys", journeys: true });
        if (r.ok) store.set("nightlyAt", today);
        log(`AUDIT nightly: ${r.said}`);
      }
    } catch (e) { log(`AUDIT schedule: ${e.message}`); }
    finally { busy = false; }
  }
  const sched = preview ? null : setInterval(tick, 5 * 60000);
  sched?.unref?.();

  return { handle, store, engine, tick, close: () => { clearInterval(sched); engine.close(); store.close(); } };
}
