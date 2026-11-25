// The few helpers the Studio and Audit need, lifted unchanged from the retired belt's lib.mjs
// (usage-limit and sign-in reading, reset times, the Claude CLI launch).

// Both CLIs refuse in plain English; neither uses an exit code that can be
// told apart from an ordinary failure.
export function looksExhausted(text) {
  // Round 2 (system N1): the CLIs print a curly apostrophe ("You’ve hit your limit"); read it as a plain one.
  const t = String(text || "").toLowerCase().replace(/[‘’ʼ′]/g, "'");
  if (!t) return false;
  return /\b(usage limit|rate limit|quota)\b/.test(t)
      || /\blimit (reached|exceeded)\b/.test(t)
      || /\bhit your (?:[\w-]+ )?limit\b/.test(t)
      || /you(?:'ve| have) (?:used|reached|hit)[^.]{0,40}\blimit\b/.test(t)
      || /out of (?:credits|usage|quota)\b/.test(t)
      || /\b(insufficient_quota|rate_limit_error|429)\b/.test(t)
      || /upgrade to continue|resets at|try again (?:later|after)/.test(t) && /limit|quota/.test(t);
}

// CLAUDE'S SIGN-IN HAS EXPIRED (2026-11-07: "Failed to authenticate: OAuth session expired and could not be refreshed",
// exit 1, and the belt rested 4 hours saying only "no fresh Claude reading"). Read from the CLI's own words (stderr
// or an error result), never a model's answer. It is not a usage limit and not the job: only he can sign in again.
export function looksAuthFailed(text) {
  const t = String(text || "").toLowerCase();
  if (!t) return false;
  return /failed to authenticate|oauth (?:session|token)[^.\n]{0,40}(?:expired|revoked|invalid)|could not be refreshed/.test(t)
      || /\b(?:authentication_error|invalid_grant)\b/.test(t)
      || /invalid api key|please run \/login|not logged in|login (?:is )?required|session (?:has )?expired[^.\n]{0,40}(?:log|sign) ?in/.test(t);
}
// The sign-in state, one small file (claude-auth.json): written on the first failure ({since, said}), removed by the first
// call that works again. io: { read, write, remove, log, now }. Returns { event: "down" | "back" } on a change, else null.
export const AUTH_SAY = "Claude sign-in expired: run `claude` once in a terminal and sign in again";

export function resetMs(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : /^\d+(\.\d+)?$/.test(String(v)) ? Number(v) : NaN;
  if (Number.isFinite(n)) return n > 0 ? (n < 1e12 ? n * 1000 : n) : null;
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
}

// USAGE WAKE (Andrew, 2026-10-15). The reset time from the CLI's own words, in ms, or null when it gives
// none. Seen: "Claude AI usage limit reached|1791508200", ISO stamps, "You’ve hit your limit · resets 8:40am
// (America/Los_Angeles)", "resets Oct 21 8pm", Codex's "try again at 11:34 PM", and "in 3 hours".
// A clock time with no zone is this computer's own time (where both CLIs print it).
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
function tzOffset(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric",
    day: "numeric", hour: "numeric", minute: "numeric", second: "numeric" }).formatToParts(new Date(ms)).map((x) => [x.type, Number(x.value)]));
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(ms / 1000) * 1000;
}
function zoned(y, mo, d, h, mi, tz) {
  if (!tz) return new Date(y, mo, d, h, mi).getTime();
  const guess = Date.UTC(y, mo, d, h, mi);
  return guess - tzOffset(guess - tzOffset(guess, tz), tz);
}
function zoneOf(s) {
  if (!s) return null;
  try { new Intl.DateTimeFormat("en-US", { timeZone: s.trim() }); return s.trim(); } catch { return null; }
}
function todayIn(now, tz) {
  if (!tz) { const d = new Date(now); return [d.getFullYear(), d.getMonth(), d.getDate()]; }
  const d = new Date(now + tzOffset(now, tz));
  return [d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()];
}
const hour24 = (h, mi, ap) => { h = Number(h); if (ap) { ap = ap.toLowerCase(); if (h === 12) h = 0; if (ap === "p") h += 12; } return [h, Number(mi || 0)]; };
export function resetFromText(text, now = Date.now()) {
  const t = String(text || "").replace(/[‘’ʼ′]/g, "'").replace(/\s+/g, " ");
  if (!t) return null;
  let m = /(?:\||resets?_?at"?\s*[:=]\s*"?)(\d{10,13})\b/i.exec(t);
  if (m) return resetMs(Number(m[1]));
  m = /\b\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?/.exec(t);
  if (m) { const v = Date.parse(m[0].replace(" ", "T")); if (Number.isFinite(v)) return v; }
  const lead = String.raw`(?:resets?|reset at|try again(?: at| after)?|again at|until|available(?: again)?(?: at)?)\s+(?:on\s+|at\s+)?`;
  const clock = String.raw`(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?m\b\.?)?(?:\s*\(([^)]+)\))?`;
  m = new RegExp(lead + String.raw`(?:[a-z]{3,9},?\s+)?([a-z]{3})[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(?:at\s+)?` + clock, "i").exec(t);
  if (m && MONTHS.includes(m[1].toLowerCase()) && (m[5] || m[4])) {
    const tz = zoneOf(m[6]), [h, mi] = hour24(m[3], m[4], m[5]), mo = MONTHS.indexOf(m[1].toLowerCase());
    let y = todayIn(now, tz)[0], v = zoned(y, mo, Number(m[2]), h, mi, tz);
    if (v < now - 86400000) v = zoned(y + 1, mo, Number(m[2]), h, mi, tz);
    return v;
  }
  m = new RegExp(lead + clock, "i").exec(t);
  if (m && (m[3] || m[2]) && Number(m[1]) <= 24) {
    const tz = zoneOf(m[4]), [h, mi] = hour24(m[1], m[2], m[3]), [y, mo, d] = todayIn(now, tz);
    let v = zoned(y, mo, d, h, mi, tz);
    if (v <= now - 60000) v = zoned(y, mo, d + 1, h, mi, tz);
    return v;
  }
  m = /\bin\s+((?:\d+(?:\.\d+)?\s*(?:days?|d|hours?|hrs?|h|minutes?|mins?|m)\b[\s,]*(?:and\s+)?)+)/i.exec(t);
  if (m) {
    const unit = { d: 86400000, h: 3600000, m: 60000 };
    let ms = 0;
    for (const [, n, u] of m[1].matchAll(/(\d+(?:\.\d+)?)\s*([dhm])/gi)) ms += Number(n) * unit[u.toLowerCase()];
    if (ms > 0) return now + ms;
  }
  return null;
}

// Drop entries whose window has passed, so the belt goes back to his
// preferred models by itself without anyone having to notice.
export function clearExpiredSwaps(swaps, now = Date.now()) {
  const out = {};
  for (const [cli, s] of Object.entries(swaps || {})) {
    if (s && s.until && new Date(s.until).getTime() <= now) continue;
    out[cli] = s;
  }
  return out;
}

const CLAUDE_ENV_DROP = new Set(["ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN", "ANTHROPIC_BASE_URL", "ANTHROPIC_PROFILE", "CLAUDE_CODE_OAUTH_TOKEN",
  "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDECODE", "AI_AGENT", "BAGGAGE", "ENABLE_CLAUDEAI_MCP_SERVERS"]);
// Kept: Windows needs the Git Bash path; the background-subagent wait ceiling is a deliberate tuning.
const CLAUDE_ENV_KEEP = new Set(["CLAUDE_CODE_GIT_BASH_PATH", "CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS"]);
export function claudeEnv(env = process.env, extra = {}) {
  const out = {};
  for (const [k, v] of Object.entries(env)) if (!CLAUDE_ENV_DROP.has(k.toUpperCase()) && !(/^CLAUDE_CODE_/i.test(k) && !CLAUDE_ENV_KEEP.has(k.toUpperCase()))) out[k] = v;
  return { ...out, ...extra };
}
// With his Claude plan out of its limit, Claude-model work goes to ChatGPT at the same strength (noClaudeModels).

export const CLAUDE_FULL_ARGS = ["--permission-mode", "bypassPermissions"];
export function claudeLaunch({ model, effort, stream = false, extra = [] } = {}) {
  return ["-p", ...(model ? ["--model", model] : []), ...(effort ? ["--effort", effort] : []), ...CLAUDE_FULL_ARGS,
    ...(stream ? ["--output-format", "stream-json", "--verbose"] : []), ...extra];
}

export function usageWords(text) {
  const t = String(text || "").replace(/[‘’ʼ′]/g, "'");
  return /hit your (?:[\w-]+ )?limit|usage limit (?:reached|for|exceeded)|(?:session|weekly|5-hour|five-hour) limit|limit reached\|\d{9,}|out of (?:usage|credits)|\bresets? (?:at |in )?(?:\d|[a-z]{3} \d)/i.test(t);
}

// A small reader for what the Claude Code and Codex CLIs stream (one JSON event per line): the answer, the cost, whether it
// ended in an error, the plan-usage reading, and a few plain steps. (The belt's version also parsed Muse and 40 other details.)
export function readStream(text) {
  const steps = []; let answer = "", cost = 0, isError = false, rate = null;
  for (const line of String(text).split(/\r?\n/)) {
    if (!line.trim().startsWith("{")) continue;
    let ev; try { ev = JSON.parse(line); } catch { continue; }
    if (ev.type === "rate_limit_event" && ev.rate_limit_info) rate = ev.rate_limit_info;
    else if (ev.type === "assistant") {
      for (const c of ev.message?.content || []) {
        if (c.type === "text" && c.text) steps.push({ kind: "say", text: c.text });
        else if (c.type === "tool_use") steps.push({ kind: "doing", text: `${c.name} ${c.input?.file_path || c.input?.pattern || c.input?.command || ""}`.trim() });
      }
    } else if (ev.type === "result") { cost = ev.total_cost_usd || 0; isError = !!ev.is_error; if (ev.result) answer = ev.result; }
    else if (ev.type === "turn.failed") { isError = true; steps.push({ kind: "failed", text: String(ev.error?.message || ev.error || "the turn failed") }); }
    else if (ev.type === "item.completed" && ev.item?.type === "agent_message") { answer = String(ev.item.text || "").trim(); steps.push({ kind: "say", text: answer }); }
    else if (ev.type === "item.completed" && ev.item?.type === "command_execution") steps.push({ kind: "doing", text: String(ev.item.command || "").slice(0, 120) });
  }
  return { steps, answer, cost, isError, rate };
}
export const plainStep = (st) => (st && ["doing", "say", "failed"].includes(st.kind) ? { text: st.text } : null);
export const readAnyStream = readStream;
