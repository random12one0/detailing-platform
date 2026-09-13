// How full is the current session's context window?
//
// Claude Code writes every session to ~/.claude/projects/<slug>/<id>.jsonl and
// records real token usage on each assistant turn. The prompt tokens on the
// LATEST turn ARE the context size — input + cache_read + cache_creation,
// because cached tokens still occupy the window.
//
// Usage: node scripts/context-check.mjs [session-id]
//
// It takes the most recently written transcript anywhere under projects/.
// Deliberately not derived from the working directory: the folder slug comes
// from where Claude Code was LAUNCHED, which is often a parent of the repo.
//
// ── AND "MOST RECENT" IS NOT "MINE" WHEN TWO SESSIONS ARE OPEN ──────────────
// Measured 2026-09-13: this printed `be7ec060… 352,141 tokens (117%) CLEAR NOW`
// to a session whose id is `5efe326c…` and whose own transcript was 1.9 MB
// against that one's 6.0 MB. **It reported lane B's context as lane C's**, with
// a verdict attached, and the header above said it was "the session you are
// sitting in". Andrew's standing rule — every message ends with your context
// state — runs on this number, and with three or four sessions in one folder
// the race is the normal case rather than the edge one.
//
// So: **PASS YOUR OWN SESSION ID** and it reads that transcript. A session
// knows its id — it is the folder name under the scratchpad path in its own
// environment. Without one it still guesses, and **it now says that it guessed
// and names any other transcript written in the last two minutes**, because a
// number that might belong to somebody else must not read like one that cannot.

import { readdir, stat, open } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const CLEAR_AT = 300_000;
const WARN_AT = Math.round(CLEAR_AT * 0.8);
const base = path.join(homedir(), ".claude", "projects");

const files = [];
for (const d of await readdir(base, { withFileTypes: true })) {
  const dir = path.join(base, d.name);
  if (!d.isDirectory()) continue;
  for (const f of await readdir(dir).catch(() => [])) {
    if (f.endsWith(".jsonl")) files.push({ p: path.join(dir, f), m: (await stat(path.join(dir, f))).mtimeMs });
  }
}
if (!files.length) { console.error("No transcripts under", base); process.exit(1); }
files.sort((a, b) => b.m - a.m);

// An id given on the command line (or in CLAUDE_SESSION_ID) wins over the
// guess, because only the session itself knows which transcript is its own.
const want = (process.argv[2] || process.env.CLAUDE_SESSION_ID || "").trim();
let mine = files[0], told = false;
if (want) {
  const hit = files.find((f) => path.basename(f.p, ".jsonl") === want);
  if (hit) { mine = hit; told = true; }
  else { console.error(`no transcript for session ${want} — falling back to the most recent, which may not be yours`); }
}

const fh = await open(mine.p, "r");
let last = 0;
for await (const line of fh.readLines()) {
  let u;
  try { u = JSON.parse(line)?.message?.usage; } catch { continue; }
  if (!u) continue;
  const t = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
  if (t) last = t;
}
await fh.close();

const verdict = last >= CLEAR_AT ? "CLEAR NOW — over the threshold"
  : last >= WARN_AT ? "WRAP UP — finish the item, write the open threads down, then clear"
  : "room to keep working";
console.log(`session: ${path.basename(mine.p, ".jsonl")}${told ? " (you named it)" : " (GUESSED — the most recently written transcript)"}`);
console.log(`context: ${last.toLocaleString()} tokens  (${Math.round(last / CLEAR_AT * 100)}% of ${CLEAR_AT.toLocaleString()})`);
console.log(`verdict: ${verdict}`);

// THE AMBIGUITY IS NAMED, NOT SWALLOWED. If another session wrote in the last
// two minutes, the guess above is a coin toss and the verdict could be about
// somebody else's window entirely.
if (!told) {
  const others = files.filter((f) => f !== mine && mine.m - f.m < 120_000);
  if (others.length) {
    console.log(`\nWARNING: ${others.length} other transcript(s) were written in the last two minutes:`);
    for (const o of others) console.log(`  ${path.basename(o.p, ".jsonl")}  ${Math.round((mine.m - o.m) / 1000)}s older`);
    console.log("This number may not be yours. Re-run as: node scripts/context-check.mjs <your-session-id>");
  }
}
