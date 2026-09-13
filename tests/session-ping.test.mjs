// THE DOORBELL, CHECKED BY RINGING IT — 2026-09-13
//
// **THIS SPAWNS THE REAL HOOK SCRIPT AND POINTS IT AT A LOCAL SERVER.** It does
// not grep `scripts/session-ping.mjs` for spellings: CLAUDE.md trap (k) cost
// this repo three false failures in one day against code that was correct, and
// every property Andrew asked for here is a BEHAVIOUR — what gets posted, what
// happens when it cannot post, what never leaves the machine.
//
// **THE ONE THING BEING GUARDED ABOVE ALL OTHERS:** an instrument that reports
// success regardless of reality. So §3 and §4 exist to prove the hook goes RED
// when the doorbell is broken, and §8 proves it never blocks the session while
// doing so.
//
// Credential-free. Runs on a bare clone, from the repo root.

import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

let pass = 0, fail = 0;
const ok = (name, cond, detail = "") => {
  if (cond) { pass++; } else { fail++; console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`); }
};

// --- the stub doorbell -------------------------------------------------------
// Records every request it is given and answers with whatever status the test
// asked for. `posts` is what the hook actually sent, byte for byte.
const posts = [];
let answer = { status: 200, body: '{"ok":true}' };
const server = createServer((req, res) => {
  let b = "";
  req.on("data", (d) => { b += d; });
  req.on("end", () => {
    posts.push({ method: req.method, raw: b });
    res.writeHead(answer.status, { "Content-Type": "application/json" });
    res.end(answer.body);
  });
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const PORT = server.address().port;
const LIVE = `http://127.0.0.1:${PORT}/`;
// A port nothing is listening on: the "cannot reach it at all" case.
const DEAD = `http://127.0.0.1:${PORT + 1}/`;

// Run the hook the way Claude Code does: JSON on stdin, nothing on argv.
const ring = (payload, { url = LIVE, env = {} } = {}) => new Promise((resolve) => {
  const p = spawn(process.execPath, ["scripts/session-ping.mjs"], {
    env: { ...process.env, SESSION_PING_URL: url, SESSION_PING_LABEL: "", ...env },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let out = "", err = "";
  p.stdout.on("data", (d) => { out += d; });
  p.stderr.on("data", (d) => { err += d; });
  p.on("close", (code) => resolve({ code, out, err }));
  p.stdin.end(typeof payload === "string" ? payload : JSON.stringify(payload));
});

const body = (i = posts.length - 1) => JSON.parse(posts[i].raw);
const reset = () => { posts.length = 0; answer = { status: 200, body: '{"ok":true}' }; };

// A transcript shaped exactly like Claude Code's: the title lines first.
const dir = mkdtempSync(path.join(tmpdir(), "dp-ping-"));
const ID = "e6841d11-bc58-4494-9094-8b3bc72280c9";
const TRANSCRIPT = path.join(dir, `${ID}.jsonl`);
writeFileSync(TRANSCRIPT, [
  JSON.stringify({ type: "custom-title", customTitle: "DP Cowork", sessionId: ID }),
  JSON.stringify({ type: "agent-name", agentName: "DP Cowork", sessionId: ID }),
  JSON.stringify({ type: "user", message: { role: "user", content: "confidential work" } }),
  "",
].join("\n"));
const untitled = path.join(dir, "11111111-2222-3333-4444-555555555555.jsonl");
writeFileSync(untitled, JSON.stringify({ type: "mode", mode: "normal" }) + "\n");
// A pane renamed AFTER it started: the title line sits below a real turn.
// Measured 2026-09-13 — one of the two live panes had no title on line 1, so
// "the header is the first few lines" was an assumption and not a fact.
const renamed = path.join(dir, "99999999-8888-7777-6666-555555555555.jsonl");
writeFileSync(renamed, [
  JSON.stringify({ type: "mode", mode: "normal" }),
  JSON.stringify({ type: "user", message: { role: "user", content: "confidential work" } }),
  JSON.stringify({ type: "custom-title", customTitle: "DP Website" }),
  "",
].join("\n"));

// --- 1 · IT POSTS THE SESSION'S OWN ID, NOT A CONSTANT ----------------------
// The whole item. Two different sessions must produce two different keys.
{
  reset();
  const a = await ring({ session_id: "aaaa-1111", transcript_path: untitled, stop_hook_active: false });
  const b = await ring({ session_id: "bbbb-2222", transcript_path: untitled, stop_hook_active: false });
  ok("1a · the ping is a POST", posts.length === 2 && posts.every((p) => p.method === "POST"), `${posts.length} requests`);
  ok("1b · it carries session_id", body(0).session_id === "aaaa-1111", JSON.stringify(body(0)));
  ok("1c · two sessions post two DIFFERENT ids",
    body(0).session_id !== body(1).session_id, `${body(0).session_id} vs ${body(1).session_id}`);
  ok("1d · no constant label is invented", body(0).label === undefined, JSON.stringify(body(0)));
  ok("1e · a good ping exits 0", a.code === 0 && b.code === 0, `${a.code}/${b.code}`);
}

// --- 2 · A HUMAN-READABLE LABEL, TAKEN FROM THE PANE'S OWN TITLE ------------
{
  reset();
  await ring({ session_id: ID, transcript_path: TRANSCRIPT });
  ok("2a · the label is the pane's custom title", body().label === "DP Cowork", JSON.stringify(body()));
  ok("2b · the id still travels with it", body().session_id === ID);

  reset();
  await ring({ session_id: ID, transcript_path: TRANSCRIPT }, { env: { SESSION_PING_LABEL: "lane-C" } });
  ok("2c · SESSION_PING_LABEL wins when it is set", body().label === "lane-C", JSON.stringify(body()));

  reset();
  await ring({ session_id: "no-title-here", transcript_path: untitled });
  ok("2d · a pane with no title sends NO label rather than a made-up one",
    body().label === undefined, JSON.stringify(body()));

  reset();
  await ring({ session_id: "renamed-later", transcript_path: renamed });
  ok("2e · a title written BELOW the first turn is still found",
    body().label === "DP Website", JSON.stringify(body()));
  ok("2f · and the turn it sat under did not travel with it",
    !posts[0].raw.includes("confidential work"), posts[0].raw);
}

// --- 3 · IT FAILS LOUDLY WHEN THE DOORBELL ANSWERS BADLY --------------------
// This is the requirement. Green-on-broken is the bug being fixed.
for (const status of [400, 500, 502]) {
  reset();
  answer = { status, body: '{"error":"nope"}' };
  const r = await ring({ session_id: "loud-test", transcript_path: untitled });
  ok(`3 · a ${status} exits non-zero`, r.code !== 0, `exit ${r.code}`);
  ok(`3 · a ${status} says so on stderr`, /session-ping:/.test(r.err) && /did NOT ring/.test(r.err), JSON.stringify(r.err));
  ok(`3 · a ${status} names the status`, r.err.includes(String(status)), JSON.stringify(r.err));
}

// --- 4 · IT FAILS LOUDLY WHEN IT CANNOT REACH THE DOORBELL AT ALL ----------
{
  reset();
  const r = await ring({ session_id: "unreachable" }, { url: DEAD });
  ok("4a · an unreachable doorbell exits non-zero", r.code !== 0, `exit ${r.code}`);
  ok("4b · and says so on stderr", /session-ping:/.test(r.err), JSON.stringify(r.err));
  ok("4c · nothing was posted", posts.length === 0, `${posts.length} requests`);
}

// --- 5 · IT REFUSES TO POST WHEN IT CANNOT SAY WHO IT IS -------------------
// A shared fallback name is exactly the collision this rewrite removes, so the
// honest outcome is a red hook, not a ping on somebody else's row.
{
  reset();
  const r = await ring({ stop_hook_active: false });
  ok("5a · no id and no transcript_path posts NOTHING", posts.length === 0, `${posts.length} requests`);
  ok("5b · and it exits non-zero", r.code !== 0, `exit ${r.code}`);
  ok("5c · and it says why", /no session_id/.test(r.err), JSON.stringify(r.err));
}

// --- 6 · transcript_path IS THE SECOND SOURCE FOR THE ID -------------------
{
  reset();
  await ring({ transcript_path: TRANSCRIPT });
  ok("6 · the id falls back to the transcript's own name", body().session_id === ID, JSON.stringify(body()));
}

// --- 7 · THE LOOP GUARD STILL COMES FIRST ----------------------------------
{
  reset();
  const r = await ring({ session_id: "guarded", stop_hook_active: true });
  ok("7a · stop_hook_active posts nothing", posts.length === 0, `${posts.length} requests`);
  ok("7b · and it is a SKIP, not a failure", r.code === 0, `exit ${r.code}`);
  ok("7c · and it is silent", r.err.trim() === "", JSON.stringify(r.err));
}

// --- 8 · IT NEVER EXITS 2, WHICH WOULD HOLD THE SESSION OPEN ---------------
// Exit 2 on a Stop hook BLOCKS stopping and feeds stderr back to the model.
// Every failure path above has to be visible without being a gate.
{
  reset();
  answer = { status: 500, body: "{}" };
  const a = await ring({ session_id: "x" });
  const b = await ring({ session_id: "" }, { url: DEAD });
  const c = await ring("not json at all", { url: DEAD });
  ok("8 · no failure path exits 2", ![a.code, b.code, c.code].includes(2), `${a.code}/${b.code}/${c.code}`);
}

// --- 9 · NONE OF THE OWNER'S WORK LEAVES THE MACHINE -----------------------
// The hook payload carries `last_assistant_message`: the entire turn.
{
  reset();
  const whole = "THIS IS THE WHOLE TURN AND IT MUST NEVER BE SENT";
  await ring({
    session_id: ID,
    transcript_path: TRANSCRIPT,
    last_assistant_message: whole,
    cwd: "D:/somewhere/private",
  });
  const sent = posts[0].raw;
  ok("9a · last_assistant_message is not sent", !sent.includes(whole), sent);
  ok("9b · cwd is not sent", !sent.includes("private"), sent);
  ok("9c · the transcript's CONTENT is not sent", !sent.includes("confidential work"), sent);
  ok("9d · exactly two fields go over the wire",
    Object.keys(body()).sort().join(",") === "label,session_id", JSON.stringify(body()));
}

// --- 10 · THE TWO PROPERTIES THAT ONLY THE SOURCE CAN SHOW -----------------
// Both are about how the process ENDS and both were real bugs: `process.exit()`
// plus `unref()` crashed Node on Windows with exit 127 AFTER a successful ping.
{
  const src = readFileSync("scripts/session-ping.mjs", "utf8");
  const code = src.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  ok("10a · no process.exit()", !/process\.exit\s*\(/.test(code));
  ok("10b · no unref()", !/\.unref\s*\(/.test(code));
  ok("10c · the exit code is set, not forced", /process\.exitCode/.test(code));
}

// --- 11 · THE EDGE FUNCTION'S TWO NON-ANSWERS ARE DIFFERENT ----------------
// `count: 0` means nobody has ever pinged; a read failure means we cannot tell.
// Source-read because there is no Deno on this machine — SAID OUT LOUD rather
// than left to look like a behaviour check.
//
// **THE COMMENTS ARE STRIPPED FIRST, AND THAT IS NOT TIDINESS.** Baselining
// this suite, the break that answers `200 { sessions: [] }` on a read error —
// the seventh costume, exactly — came back GREEN, because the function's own
// header documents `502` and `sessions: null` in prose and the grep matched the
// documentation instead of the code. A check that a file's comments can satisfy
// is a check the code can fail. Same family as `i18n-coverage` counting a
// `t("…")` inside a comment.
{
  const raw = readFileSync("supabase/functions/session-ping/index.ts", "utf8");
  const fn = raw.split("\n").filter((l) => !l.trim().startsWith("//")).join("\n");
  ok("11 · the comment strip left something to read", fn.length > 1000 && fn.length < raw.length,
    `${fn.length} of ${raw.length} bytes`);
  ok("11a · a read error answers 502", /\b502\b/.test(fn));
  ok("11b · and with sessions: null, never an empty array", /sessions:\s*null/.test(fn));
  ok("11c · the GET is keyed per session", /select\("session_id, label, at"\)/.test(fn));
  ok("11d · the upsert conflicts on session_id", /onConflict:\s*"session_id"/.test(fn));
  ok("11e · a body with no identity is refused", /session_id \(or label\) is required/.test(fn));
  ok("11f · `latest` survives for the blunt bell's reader", /latest,/.test(fn));
  ok("11g · the label is omitted when absent, so it stays sticky",
    /if \(label\) row\.label = label;/.test(fn));
  console.log("  NOTE  §11 reads source, not behaviour — there is no Deno on this machine.");
}

server.close();
console.log(`${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
