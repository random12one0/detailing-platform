// How full is the current session's context window?
//
// Claude Code writes every session to ~/.claude/projects/<slug>/<id>.jsonl and
// records real token usage on each assistant turn. The prompt tokens on the
// LATEST turn ARE the context size — input + cache_read + cache_creation,
// because cached tokens still occupy the window.
//
// Usage: node scripts/context-check.mjs
//
// It takes the most recently written transcript anywhere under projects/,
// which is the session you are sitting in. Deliberately not derived from the
// working directory: the folder slug comes from where Claude Code was
// LAUNCHED, which is often a parent of the repo.

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

const fh = await open(files[0].p, "r");
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
console.log(`session: ${path.basename(files[0].p, ".jsonl")}`);
console.log(`context: ${last.toLocaleString()} tokens  (${Math.round(last / CLEAR_AT * 100)}% of ${CLEAR_AT.toLocaleString()})`);
console.log(`verdict: ${verdict}`);
