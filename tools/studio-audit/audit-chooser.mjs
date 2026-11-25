// ===========================================================================
// THE AUDIT'S AI CHOOSER — which AI, which model, which effort, for each audit job.
// ===========================================================================
//
// Andrew, 2026-10-22: a chooser for the audit only (settings on the Audit tab), across Claude and
// ChatGPT; it knows his plans, stops new work at the usage lines he sets and starts again by itself.
// Plan: audit-tab/CHOOSER-PLAN.md. The belt's own picker (picker.mjs) is separate and unchanged.
//
// PURE: no files, no clock except `now`, no processes. audit-engine.mjs gathers the readings.
// Order of decision: a fixed choice he set > the AI planner's suggestion > the rules. Limits beat all three.

export const PROVIDERS = ["claude", "codex"];
export const NAME = { claude: "Claude", codex: "ChatGPT" };
export const TIERS = {
  claude: { 3: "opus", 2: "claude-sonnet-5-5", 1: "claude-sonnet-5-5" },   // Haiku stops early on long tasks: never an auditor
  codex: { 3: "gpt-6.1-sol", 2: "gpt-6.1-sol", 1: "gpt-5.6-terra" },
};
// fixed choices offered on the Audit tab, per kind of check
export const FIXED = [
  { id: "auto", label: "Let the chooser decide" },
  { id: "claude:opus", label: "Claude Opus" }, { id: "claude:claude-sonnet-5-5", label: "Claude Sonnet" },
  { id: "codex:gpt-6.1-sol", label: "ChatGPT Sol" }, { id: "codex:gpt-5.6-terra", label: "ChatGPT Terra" },
];
export const DEPTHS = { quick: { max: 4, label: "Quick" }, medium: { max: 8, label: "Medium" }, deep: { max: 15, label: "Deep" } };
const KIND_TIER = { security: 3, backend: 3, code: 3, integrations: 2, product: 2, looks: 2 };
const EFFORTS = ["low", "medium", "high", "xhigh", "max"];

export const DEFAULTS = {
  claude: true, codex: true, prefer: "auto", aiPick: true,
  claudeMaxUntil: "2026-10-25", chatgptFreeUntil: "2027-01-03",
  claudeStop5h: 90, claudeStopWeek: 80, codexStop5h: 90, codexStopWeek: 80,
  finishFrom: 80, staleMin: 30, saveFrom: 70,
  crossCheck: true, depth: "medium", kind: {},
};
export const settingsOf = (audit = {}) => ({ ...DEFAULTS, ...(audit.ai || {}), kind: { ...((audit.ai || {}).kind || {}) } });

// { fiveHour, week } percentages (0-100) or null when unknown or older than staleMin minutes.
export function pressure(u, s, now) {
  if (!u || !u.at || now - Date.parse(u.at) > s.staleMin * 60000) return { fiveHour: null, week: null, stale: true };
  const live = (w) => (w && typeof w.pct === "number" ? (w.resetsAt && w.resetsAt * 1000 <= now ? 0 : w.pct) : null);
  return { fiveHour: live(u.fiveHour), week: live(u.week), stale: false };
}
const worst = (p) => Math.max(p.fiveHour ?? -1, p.week ?? -1);
const pctText = (p) => (p.stale ? "usage not known" : [p.fiveHour != null && `${p.fiveHour}% of 5 h`, p.week != null && `${p.week}% of week`].filter(Boolean).join(", ") || "usage not known");

// Can this provider take a new job right now? { ok, why, until }
export function room(provider, ctx) {
  const { s, now } = ctx;
  if (!s[provider]) return { ok: false, why: `${NAME[provider]} is switched off for audits` };
  const down = ctx.down?.[provider];
  if (down && down.until > now) return { ok: false, why: `${NAME[provider]} is out of its usage limit`, until: down.until };
  const p = pressure(ctx.usage?.[provider], s, now);
  // his rule: a run that is at least finishFrom% done may finish past the stop lines (hard limits still stop it)
  if (s.finishFrom > 0 && (ctx.progress || 0) * 100 >= s.finishFrom) return { ok: true, why: `${NAME[provider]} ${pctText(p)}; the run is ${Math.round(ctx.progress * 100)}% done, so it finishes` };
  const s5 = s[`${provider}Stop5h`], sw = s[`${provider}StopWeek`];
  const u = ctx.usage?.[provider] || {};
  if (p.fiveHour != null && p.fiveHour >= s5) return { ok: false, why: `${NAME[provider]} is at ${p.fiveHour}% of its 5-hour window (your stop: ${s5}%)`, until: u.fiveHour?.resetsAt ? u.fiveHour.resetsAt * 1000 : null };
  if (p.week != null && p.week >= sw) return { ok: false, why: `${NAME[provider]} is at ${p.week}% of its week (your stop: ${sw}%)`, until: u.week?.resetsAt ? u.week.resetsAt * 1000 : null };
  return { ok: true, why: `${NAME[provider]} ${pctText(p)}` };
}

// The usual order when he has not fixed one: his plans decide (dates are his local calendar days).
export function order(s, today, usage, now) {
  if (s.prefer && s.prefer !== "auto" && PROVIDERS.includes(s.prefer)) return [s.prefer, ...PROVIDERS.filter((p) => p !== s.prefer)];
  const maxOn = s.claudeMaxUntil && today <= s.claudeMaxUntil;
  let o = maxOn ? ["claude", "codex"] : ["codex", "claude"];
  if (s.chatgptFreeUntil && today > s.chatgptFreeUntil) o = [...o.filter((p) => p !== "codex"), "codex"];
  // the belt's gap rule: two subscriptions far apart in use -> the one with more left goes first
  const a = pressure(usage?.claude, s, now), b = pressure(usage?.codex, s, now);
  if (!a.stale && !b.stale && worst(a) >= 0 && worst(b) >= 0 && Math.abs(worst(a) - worst(b)) >= 20) {
    const lower = worst(a) < worst(b) ? "claude" : "codex", hi = lower === "claude" ? "codex" : "claude";
    if (o.indexOf(hi) < o.indexOf(lower)) { o = o.filter((p) => p !== lower); o.splice(o.indexOf(hi), 0, lower); }
  }
  return o;
}

export function tierFor(job, depth) {
  let t = job.role === "check" ? (["blocker", "before"].includes(job.severity) ? 3 : 2) : (KIND_TIER[job.kind] || 2);
  if (depth === "quick") t = Math.min(t, 2);
  if (depth === "deep") t = 3;
  if ((job.attempt || 1) > 1) t = Math.min(3, t + 1);
  return t;
}
export function effortFor(provider, job, depth, s, p) {
  let e = job.role === "check" ? (depth === "deep" ? "high" : "medium") : depth === "quick" ? "medium" : depth === "deep" ? "xhigh" : "high";
  if (provider === "codex" && EFFORTS.indexOf(e) > 2) e = "high";        // Plus plan: never above high
  if (p && worst(p) >= s.saveFrom && EFFORTS.indexOf(e) > 2) e = "high"; // save the allowance past 70%
  return e;
}
const fixedOf = (v) => { const m = /^(claude|codex):(.+)$/.exec(String(v || "")); return m ? { provider: m[1], model: m[2] } : null; };

// job: { kind, role: "audit"|"check", area, severity, attempt, finder: {provider, model} }
// ctx: { s, depth, usage, down, today, now, progress, plan }
export function choose(job, ctx) {
  const { s, now } = ctx, depth = ctx.depth || s.depth || "medium";
  const kindKey = job.role === "check" ? "check" : job.kind;
  const tier = tierFor(job, depth);
  const make = (provider, model, why) => {
    const p = pressure(ctx.usage?.[provider], s, now);
    const effort = effortFor(provider, job, depth, s, p);
    return { ok: true, provider, model: model || TIERS[provider][tier], effort, tier, why };
  };
  // 1. his fixed choice for this kind: kept even when its AI is out (the job waits), because he chose it
  const fixed = fixedOf(s.kind?.[kindKey]);
  if (fixed && !(job.noCodex && fixed.provider === "codex")) {
    const r = room(fixed.provider, ctx);
    return r.ok ? make(fixed.provider, fixed.model, `your fixed choice for this kind (${r.why})`)
      : { ok: false, wait: true, why: `${r.why}; your fixed choice for this kind waits for it`, until: r.until || null };
  }
  const rooms = Object.fromEntries(PROVIDERS.map((p) => [p, room(p, ctx)]));
  // ChatGPT runs without a sandbox on Windows and has no key-file guard: never on the main checkout, which holds the keys
  if (job.noCodex) rooms.codex = { ok: false, why: "ChatGPT cannot do this job (it reads the main checkout, where the key files are)" };
  let open = order(s, ctx.today, ctx.usage, now).filter((p) => rooms[p].ok);
  // the second check: a different AI company from the finder when one has room
  let cross = "";
  if (job.role === "check" && job.finder?.provider) {
    const other = open.filter((p) => p !== job.finder.provider);
    if (s.crossCheck && other.length) { open = other; cross = `; a different company from the finder (${NAME[job.finder.provider]})`; }
    else if (open.includes(job.finder.provider)) {
      // same company: a different model if it has one
      const alt = Object.values(TIERS[job.finder.provider]).find((m) => m !== job.finder.model);
      if (!alt) return open.length > 1 ? make(open.find((p) => p !== job.finder.provider), null, "second check by another AI") : { ok: false, wait: true, why: `only ${NAME[job.finder.provider]} has room, and it found this problem itself: the check waits for another AI`, until: earliest(rooms) };
      if (open[0] === job.finder.provider) return make(job.finder.provider, alt, `second check by a different ${NAME[job.finder.provider]} model (${rooms[job.finder.provider].why})`);
    }
  }
  if (!open.length) return { ok: false, wait: true, why: PROVIDERS.map((p) => rooms[p].why).join("; "), until: earliest(rooms) };
  // 2. the AI planner's suggestion, if its AI has room
  const sug = ctx.plan?.[kindKey];
  if (s.aiPick && sug && open.includes(sug.provider)) {
    const model = sug.model && Object.values(TIERS[sug.provider]).includes(sug.model) ? sug.model : null;
    return make(sug.provider, model, `planner: ${String(sug.why || "suggested").slice(0, 160)} (${rooms[sug.provider].why})${cross}`);
  }
  // 3. the rules
  const pick = open[0];
  return make(pick, null, `${depth} depth, ${["", "light", "middle", "strong"][tier]} job; ${rooms[pick].why}${cross}`);
}
const earliest = (rooms) => { const t = Object.values(rooms).map((r) => r.until).filter((x) => x && x > 0); return t.length ? Math.min(...t) : null; };

// The planner's answer: { "<kind>": { provider, model, why } } — anything malformed is dropped.
export function parsePlan(text) {
  const m = String(text || "").match(/\{[\s\S]*\}/);
  if (!m) return null;
  let o; try { o = JSON.parse(m[0]); } catch { return null; }
  const out = {};
  for (const [k, v] of Object.entries(o || {})) if (v && PROVIDERS.includes(v.provider)) out[k] = { provider: v.provider, model: v.model ? String(v.model) : null, why: String(v.why || "").slice(0, 300) };
  return Object.keys(out).length ? out : null;
}
export function plannerPrompt({ knowledge, kinds, areas, depth, rooms }) {
  return `You plan which AI runs each kind of check in a code audit. Read the notes, the current room of each AI, and answer with JSON only.

NOTES (from the owner):
${knowledge}

THIS RUN: depth ${depth}; areas ${areas.join(", ")}; kinds of check ${kinds.join(", ")}, plus "check" (the second check of each finding, which must be a different company from the finder when possible).
ROOM RIGHT NOW:
${rooms.map((r) => `- ${r.provider}: ${r.ok ? "available" : "NOT available"}: ${r.why}`).join("\n")}

Answer with one JSON object and nothing else, one key per kind (and "check"):
{"security": {"provider": "claude|codex", "model": "exact model id or null", "why": "one short reason"}, ...}
Only use available providers. Model ids: claude: opus, claude-sonnet-5-5; codex: gpt-6.1-sol, gpt-5.6-terra.`;
}
