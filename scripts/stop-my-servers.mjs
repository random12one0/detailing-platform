// STOP LANE C'S OWN PREVIEW SERVERS — AND NOTHING ELSE.
//
// Written 2026-09-13, the day lane C killed the process on 5173 while tidying
// up after one of its own browser runs and took down the dev server a product
// session was measuring against. `docs/START-HERE.md` § A PORT IS A LANE'S
// PROPERTY TOO is the rule; this file is the rule with teeth, because a rule
// that only exists in prose is one a session reasons past at 3am.
//
// **THE ALLOWLIST IS THE WHOLE POINT AND IT IS NOT CONFIGURABLE.** There is no
// `--force`, no `--port` that escapes it and no environment variable that
// widens it. A session that finds this refusing the port it wants has found the
// rule working, not a bug: say which lane owns that port and stop.
//
//   node scripts/stop-my-servers.mjs            # stop 4173 and 4174
//   node scripts/stop-my-servers.mjs 4173       # stop just the product preview
//   node scripts/stop-my-servers.mjs --list     # say what is listening, kill nothing
//
// Credential-free. Windows and POSIX.

import { execFileSync } from "node:child_process";

// Lane C's two-worktree rig: 4173 serves the real bundle, 4174 the same bundle
// with every product source file blanked. `docs/blind-browser-2026-09-13.md`.
const MINE = [4173, 4174];

// Ports that belong to somebody else, named so the refusal can say WHOSE. A
// port absent from both lists is refused too — the allowlist is what permits,
// this list only makes the message useful.
const THEIRS = {
  5173: "lane B (product) — the dev server, and the only one in the project",
  5174: "lane B (product) — Vite's own fallback when 5173 is taken",
  54321: "the local Supabase stack",
};

const argv = process.argv.slice(2);
const listOnly = argv.includes("--list");
const asked = argv.filter((a) => !a.startsWith("--"));

// **A REFUSAL EXITS 1 AND KILLS NOTHING AT ALL**, including the ports that were
// allowed in the same command. Half-executing a command a session got wrong is
// how "it refused" turns into "it refused and also did some of it".
const wanted = asked.length ? asked.map(Number) : MINE;
const refused = wanted.filter((p) => !MINE.includes(p));
if (refused.length) {
  for (const p of refused) {
    console.error(`  REFUSED  ${p} is not lane C's port — ${THEIRS[p] ?? "no lane in docs/START-HERE.md claims it"}`);
  }
  console.error(`\nLane C owns ${MINE.join(" and ")} and nothing else. Nothing was stopped.`);
  console.error("If a server that is not yours genuinely must die, say which lane owns it and stop.");
  process.exit(1);
}

// The PIDs listening on a port. Nothing here can be handed a port the check
// above did not allow: `port` is only ever an element of `wanted`.
function listeners(port) {
  try {
    if (process.platform === "win32") {
      const out = execFileSync("netstat", ["-ano", "-p", "TCP"], { encoding: "utf8" });
      return [...new Set(out.split("\n")
        // The LOCAL address column only, and LISTENING only: a browser
        // CONNECTED to 4173 has 4173 in its FOREIGN column, and killing that
        // would kill the thing doing the measuring.
        .map((l) => l.trim().match(/^TCP\s+\S+:(\d+)\s+\S+\s+LISTENING\s+(\d+)$/))
        .filter((m) => m && Number(m[1]) === port)
        .map((m) => Number(m[2])))];
    }
    const out = execFileSync("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-t"], { encoding: "utf8" });
    return [...new Set(out.split("\n").map((s) => Number(s.trim())).filter(Boolean))];
  } catch {
    // lsof and netstat both exit non-zero when they match nothing.
    return [];
  }
}

let stopped = 0, idle = 0;
for (const port of wanted) {
  const pids = listeners(port);
  if (!pids.length) { idle++; console.log(`  idle     ${port} — nothing listening`); continue; }
  for (const pid of pids) {
    if (listOnly) { console.log(`  listening ${port} — pid ${pid}`); continue; }
    try {
      if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(pid, "SIGTERM");
      stopped++;
      console.log(`  stopped  ${port} — pid ${pid}`);
    } catch (e) {
      console.error(`  FAILED   ${port} — pid ${pid}: ${e.message}`);
    }
  }
}
// COUNT, DO NOT MERELY MATCH. A run that stopped nothing because nothing was
// running reads exactly like a run that stopped nothing because the instrument
// is blind, so this line says which.
console.log(`\n${listOnly ? "listed" : "stopped"} ${stopped}, ${idle} of ${wanted.length} already idle — ports ${wanted.join(", ")}`);
