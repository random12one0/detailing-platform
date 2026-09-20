// WHAT NAME THE DOORBELL RINGS WITH — 2026-09-20.
//
// `scripts/session-ping.mjs` had been posting `label: null` for one of the two
// panes for days, and the script printed nothing wrong while it did it. The
// lookup is the part that was broken, so the lookup is the part with a check
// on it now.
//
// **IT RUNS THE REAL SCRIPT AS A REAL HOOK.** The script cannot be imported —
// it is a hook, so importing it fires a ping — so every case here spawns it
// the way Claude Code does: JSON on stdin, `SESSION_PING_URL` pointed at a
// throwaway server on localhost, and the assertion is made against the body
// that server actually received. Nothing here can pass by reading the source.
//
// The fixtures are built larger than the 256 KB window on purpose. A fixture
// small enough to fit entirely inside one read would pass under a head scan,
// a tail scan or no scan at all, and would have caught none of this.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const SCRIPT = path.join(process.cwd(), "scripts", "session-ping.mjs");
const dir = mkdtempSync(path.join(tmpdir(), "session-ping-"));

const titleLine = (name) =>
  JSON.stringify({ type: "custom-title", customTitle: name, sessionId: "fixture" });

// Conversation, near enough. Every line is valid JSON and none of it is a
// title record, which is the only property the scan is allowed to care about.
const fillerTo = (bytes, text = "ordinary conversation, nothing to see") => {
  const line = JSON.stringify({ type: "user", message: { role: "user", content: text } });
  const out = [];
  let n = 0;
  while (n < bytes) { out.push(line); n += line.length + 1; }
  return out;
};

const fixture = (name, lines) => {
  const file = path.join(dir, `${name}.jsonl`);
  writeFileSync(file, lines.join("\n") + "\n");
  return file;
};

// One run of the hook. Returns what the doorbell was actually sent.
const ring = (transcript) => new Promise((resolve, reject) => {
  const seen = [];
  const server = createServer((req, res) => {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      seen.push(body);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("{}");
    });
  });
  server.listen(0, "127.0.0.1", () => {
    const { port } = server.address();
    const child = spawn(process.execPath, [SCRIPT], {
      env: { ...process.env, SESSION_PING_URL: `http://127.0.0.1:${port}`, SESSION_PING_LABEL: "" },
      stdio: ["pipe", "pipe", "pipe"],
    });
    let err = "";
    child.stderr.on("data", (d) => { err += d; });
    child.stdin.end(JSON.stringify({ session_id: "fixture", transcript_path: transcript }));
    child.on("close", (code) => {
      server.close();
      const posted = seen.length ? JSON.parse(seen[0]) : null;
      resolve({ posted, code, err });
    });
    child.on("error", reject);
  });
});

test("a pane renamed mid-session rings with the name it has NOW", async () => {
  // The shape that was broken: nothing in the first 8 KB, an old name in the
  // middle, the current name near the end.
  const file = fixture("renamed", [
    ...fillerTo(60_000),
    titleLine("DP Builder"),
    ...fillerTo(240_000),
    titleLine("DP Cowork2"),
    ...fillerTo(10_000),
  ]);
  const { posted, code } = await ring(file);
  assert.equal(posted.label, "DP Cowork2", "the last title record is the pane's name");
  assert.notEqual(posted.label, "DP Builder", "an earlier record is history, not the name");
  assert.equal(code, 0);
});

test("a pane named on line 1 of a long transcript still rings — DP Cowork's shape", async () => {
  // No regression check. This is the one that worked before the change, and it
  // reaches the head only by falling through the tail window.
  const file = fixture("head-only", [titleLine("DP Cowork"), ...fillerTo(400_000)]);
  const { posted, code } = await ring(file);
  assert.equal(posted.label, "DP Cowork");
  assert.equal(code, 0);
});

test("CANARY — no title record anywhere means NO label, not a made-up one", async () => {
  // The lookup failing has to look like failure. A scan that returned some
  // nearby string here would have been indistinguishable from a working one on
  // every other case in this file.
  const file = fixture("no-title", fillerTo(400_000));
  const { posted, code } = await ring(file);
  assert.equal(posted.session_id, "fixture", "the ping still rings without a name");
  assert.equal("label" in posted, false, "and it rings anonymously rather than wrongly");
  assert.equal(code, 0);
});

test("CANARY — conversation that TALKS about customTitle is not a title", async () => {
  // This session's own transcript is full of the literal `customTitle`,
  // because fixing this script meant reading it out loud. A scan that matched
  // on the word rather than the record would have picked a sentence up off the
  // floor and posted it as the pane's name.
  const file = fixture("talks-about-it", [
    ...fillerTo(300_000, 'the script reads customTitle out of the transcript header'),
    JSON.stringify({ type: "assistant", message: { content: '{"customTitle":"Not A Real Name"}' } }),
    // And the shape that actually catches a lazy regex: a real record of some
    // OTHER kind that happens to carry the word further in. `"customTitle":"`
    // appears in this line verbatim, unescaped, and it is still not a title.
    JSON.stringify({ type: "summary", payload: { customTitle: "Not A Real Name Either" } }),
    ...fillerTo(10_000, 'and agentName too, while we are at it'),
  ]);
  const { posted } = await ring(file);
  assert.equal("label" in posted, false, "a mention is not a record");
});

test("a missing transcript costs the name, never the ping", async () => {
  const { posted, code } = await ring(path.join(dir, "does-not-exist.jsonl"));
  assert.equal(posted.session_id, "fixture");
  assert.equal("label" in posted, false);
  assert.equal(code, 0);
});

test("a doorbell that answers 500 exits 1 — loud, and never 2", async () => {
  // Exit 2 on a Stop hook blocks the session from stopping. The script says so
  // in its own header; this is the line that proves it still means it.
  const file = fixture("for-500", [titleLine("DP Cowork2"), ...fillerTo(1000)]);
  const server = createServer((req, res) => { res.writeHead(500); res.end("no"); });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address();
  const child = spawn(process.execPath, [SCRIPT], {
    env: { ...process.env, SESSION_PING_URL: `http://127.0.0.1:${port}`, SESSION_PING_LABEL: "" },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let err = "";
  child.stderr.on("data", (d) => { err += d; });
  child.stdin.end(JSON.stringify({ session_id: "fixture", transcript_path: file }));
  const code = await new Promise((r) => child.on("close", r));
  server.close();
  assert.equal(code, 1);
  assert.match(err, /did NOT ring/);
});

test.after(() => rmSync(dir, { recursive: true, force: true }));
