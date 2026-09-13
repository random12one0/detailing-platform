// THE STOP HOOK'S ONE JOB: ring the doorbell and say nothing else.
//
//   node scripts/session-ping.mjs
//
// Wired as a `Stop` hook in `.claude/settings.json`. Claude Code runs it when a
// turn finishes and pipes the hook's own JSON in on stdin.
//
// **IT SENDS A FIXED LABEL AND NOTHING ELSE, AND THAT IS THE WHOLE POINT.** The
// Stop hook's payload contains `last_assistant_message` — the entire text of the
// turn that just ended. **None of the owner's work leaves his infrastructure so
// that somebody can learn a session went quiet.** That is also why this is a
// script rather than the `http` hook type: `http` forwards the payload verbatim,
// and there would be no place to drop the message even if we meant to.
//
// **`stop_hook_active` IS CHECKED FIRST AND IT IS NOT OPTIONAL.** Claude Code
// sets it when the model is already continuing *because* of a stop hook. A hook
// that ignores it can hold a session in a loop it cannot leave, which is a far
// worse outcome than a missed ping.
//
// **IT NEVER FAILS THE TURN.** Every path exits 0 — no network, no server, a
// timeout, a bad response. A doorbell that can break the thing it is attached
// to is not worth having, so the failure mode is silence.
//
// The URL is public and carries no secret: the function is deployed
// `verify_jwt=false` precisely so watching it needs no key.

const URL_ = process.env.SESSION_PING_URL
  || "https://kguqylyzgyzfktkfnhjb.supabase.co/functions/v1/session-ping";
const LABEL = process.env.SESSION_PING_LABEL || "dp-builder";

// **NO `unref()` AND NO `process.exit()` — 2026-09-13, and it was measured.**
// The first version used both and Node on Windows died with
// `Assertion failed: !(handle->flags & UV_HANDLE_CLOSING)` and **exit 127**,
// AFTER the ping had already landed. A doorbell that rings and then reports a
// failed hook is worse than no doorbell, because the failure is attributed to
// the turn rather than to the doorbell. The timer is cleared on `end` instead,
// and the process is left to finish on its own.
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
  // arrives promptly, carry on without it — the payload is read only for the
  // loop guard, and its absence is not a reason to skip the ping.
  const timer = setTimeout(finish, 800);
});

try {
  const raw = await read();
  let payload = {};
  try { payload = raw ? JSON.parse(raw) : {}; } catch { /* not JSON; the guard below just defaults */ }

  // THE LOOP GUARD, BEFORE ANYTHING ELSE.
  if (payload.stop_hook_active !== true) {

    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 4000);
    await fetch(URL_, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // THE MINIMUM PAYLOAD. One field, chosen here, never taken from `payload`.
      body: JSON.stringify({ label: LABEL }),
      signal: ctl.signal,
    }).catch(() => {});
    clearTimeout(t);
  }
} catch { /* a doorbell must never break the door */ }

// Left to exit on its own. See the note on `read` — forcing it was what turned
// a successful ping into a failed hook.
process.exitCode = 0;
