// THE STOP HOOK'S ONE JOB: ring the doorbell, say WHICH session rang it, and
// say nothing else.
//
//   node scripts/session-ping.mjs
//
// Wired as a `Stop` hook in `.claude/settings.json`. Claude Code runs it when a
// turn finishes and pipes the hook's own JSON in on stdin.
//
// ---------------------------------------------------------------------------
// IT POSTS THE SESSION'S OWN ID, NEVER A CONSTANT — 2026-09-13, Andrew's ask
// ---------------------------------------------------------------------------
// It used to post the fixed string `dp-builder`, and the row is keyed on that,
// so with two panes open the second to stop overwrote the first. **A doorbell
// that cannot say who rang it is close to useless with more than one session.**
// The id is free: it is already on stdin, which this script already parses for
// the loop guard.
//
// **A READABLE NAME COMES FROM THE PANE'S OWN TITLE.** Claude Code writes
// `{"type":"custom-title","customTitle":"DP Cowork"}` on the FIRST line of the
// transcript, and the payload hands us that transcript's path. So the name
// Andrew already typed into the pane is the name on the bell, and he is asked
// for nothing. `SESSION_PING_LABEL` still wins if it is set.
//
// **ONLY THE FIRST 8 KB OF THE TRANSCRIPT IS EVER READ**, which is the header
// block. Nothing this script touches contains a word of the conversation.
//
// ---------------------------------------------------------------------------
// IT FAILS LOUDLY — and this REPLACES the old "every path exits 0"
// ---------------------------------------------------------------------------
// **Andrew's requirement, and it is the whole point of the rewrite:** an
// instrument that reports success regardless of reality is the bug being fixed
// (`FOUND.md` § READ THIS FIRST — seven of them in one run). The old version
// wrote `.catch(() => {})` around the POST and never looked at the status, so a
// dead function, a 500 and a typo in the URL were all indistinguishable from a
// working doorbell. A bell nobody can tell is broken is worse than no bell.
//
// **SO: A FAILURE WRITES TO stderr AND EXITS 1.** Claude Code shows a non-zero
// hook's stderr to the user, which is the "loud and visible" half.
//
// **AND IT IS EXIT 1, NEVER EXIT 2, WHICH IS THE HALF THAT KEEPS THE DOOR
// INTACT.** Exit 2 on a Stop hook BLOCKS the session from stopping and feeds
// stderr back to the model — a doorbell that can hold a session in a loop is
// exactly the failure `stop_hook_active` exists to prevent. Exit 1 is a visible
// error against the turn; it does not change what the session does.
//
// **NO `unref()` AND NO `process.exit()` — 2026-09-13, and it was measured.**
// The first version used both and Node on Windows died with
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` and **exit 127**,
// AFTER the ping had already landed — a successful ping reported as a failed
// hook, which is the same lie pointed the other way. The timer is cleared on
// `end` instead and `process.exitCode` carries the verdict.
//
// **`stop_hook_active` IS CHECKED FIRST AND IT IS NOT OPTIONAL.** Claude Code
// sets it when the model is already continuing *because* of a stop hook.
//
// The URL is public and carries no secret: the function is deployed
// `verify_jwt=false` precisely so watching it needs no key.

import { openSync, readSync, closeSync } from "node:fs";
import path from "node:path";

const URL_ = process.env.SESSION_PING_URL
  || "https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/session-ping";

const die = (why) => {
  console.error(`session-ping: ${why} — the doorbell did NOT ring for this turn.`);
  process.exitCode = 1;
};

const read = () => new Promise((resolve) => {
  if (process.stdin.isTTY) return resolve("");
  let s = "";
  let done = false;
  const finish = () => { if (!done) { done = true; clearTimeout(timer); resolve(s); } };
  process.stdin.setEncoding("utf8");
  process.stdin.on("data", (d) => { s += d; });
  process.stdin.on("end", finish);
  process.stdin.on("error", finish);
  // A hook that hangs waiting for stdin holds the session open. If nothing
  // arrives promptly, carry on without it.
  const timer = setTimeout(finish, 800);
});

// The pane's own name, off the transcript's header lines. Never throws: a
// missing or unreadable transcript costs a readable label, not the ping — and
// the label is sticky server-side, so a ping without one keeps the last name.
const titleOf = (file) => {
  if (!file) return "";
  let fd;
  try {
    fd = openSync(file, "r");
    const buf = Buffer.alloc(8192);
    const n = readSync(fd, buf, 0, buf.length, 0);
    for (const line of buf.toString("utf8", 0, n).split("\n")) {
      if (!line.startsWith("{")) continue;
      let o;
      try { o = JSON.parse(line); } catch { continue; }
      if (o.customTitle) return String(o.customTitle);
      if (o.agentName) return String(o.agentName);
      // The header block is the first few lines; once real turns start there
      // is no title and no reason to keep reading.
      if (o.type === "user" || o.type === "assistant") break;
    }
  } catch { /* no title, no problem */ } finally {
    if (fd !== undefined) try { closeSync(fd); } catch { /* nothing */ }
  }
  return "";
};

const raw = await read();
let payload = {};
try { payload = raw ? JSON.parse(raw) : {}; } catch { /* the guard below defaults */ }

// THE LOOP GUARD, BEFORE ANYTHING ELSE. Not a failure — a deliberate skip.
if (payload.stop_hook_active === true) {
  process.exitCode = 0;
} else {
  // TWO SOURCES FOR THE ID, BOTH FROM THE PAYLOAD, AND NO THIRD.
  // `transcript_path` is named after the session, so it answers the same
  // question if the field is ever renamed. There is deliberately no "newest
  // transcript on disk" fallback: with several panes open that guesses, and a
  // doorbell that guesses who rang it is the bug this replaces.
  const transcript = typeof payload.transcript_path === "string" ? payload.transcript_path : "";
  const sessionId = String(payload.session_id || "").trim()
    || (transcript ? path.basename(transcript, ".jsonl") : "");

  if (!sessionId) {
    // NOT a silent skip and NOT a constant. Posting a shared name here is what
    // produced the collision in the first place.
    die("no session_id and no transcript_path on the hook payload");
  } else {
    const label = process.env.SESSION_PING_LABEL || titleOf(transcript);
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    try {
      const res = await fetch(URL_, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // THE MINIMUM PAYLOAD. Two fields, both chosen here. Nothing is copied
        // out of `payload` except the id — `last_assistant_message` has no path
        // to this request.
        body: JSON.stringify(label ? { session_id: sessionId, label } : { session_id: sessionId }),
        signal: ctl.signal,
      });
      // THE STATUS IS READ. Not doing this is what let a broken bell look fine.
      if (!res.ok) die(`the doorbell answered ${res.status}`);
    } catch (err) {
      die(err?.name === "AbortError" ? "timed out after 4s" : `could not reach it — ${err?.message || err}`);
    } finally {
      clearTimeout(t);
    }
  }
}

// Left to exit on its own. See the note above — forcing it was what turned a
// successful ping into a failed hook.
