// A stand-in for the claude CLI in audit-engine tests: answers instantly, writes
// the file the real auditor/checker would write, prints a stream-json result.
import { writeFileSync } from "node:fs";
let prompt = "";
process.stdin.on("data", (c) => (prompt += c));
process.stdin.on("end", () => {
  // a ChatGPT-style stream that hit its usage limit (the message is in a failed turn, not an answer)
  if (process.argv.includes("codex") && prompt.includes("YOUR AREA: Money")) {
    console.log(JSON.stringify({ type: "thread.started", thread_id: "t" }));
    console.log(JSON.stringify({ type: "turn.started" }));
    console.log(JSON.stringify({ type: "error", message: "You’ve hit your usage limit. Upgrade to Pro or try again at 1:50 AM." }));
    console.log(JSON.stringify({ type: "turn.failed", error: { message: "You’ve hit your usage limit. Upgrade to Pro or try again at 1:50 AM." } }));
    process.exit(1);
  }
  if (prompt.includes("THIS IS A RE-CHECK")) {
    const fixed = prompt.includes("REALLY FIXED");
    writeFileSync("verdict.json", JSON.stringify({ verdict: fixed ? "rejected" : "confirmed", why: fixed ? "the guard is there now" : "same code as before", duplicate_of: null }));
  } else if (prompt.includes("independent second checker")) {
    const t = (prompt.match(/"title": "([^"]+)"/) || [])[1] || "";
    const v = t.includes("DUP") ? { verdict: "confirmed", why: "seen", duplicate_of: "97.1", severity: "before" }
      : t.includes("FALSE") ? { verdict: "rejected", why: "not real", duplicate_of: null, severity: "after" }
      : { verdict: "confirmed", why: "seen at audit-store.mjs:10", duplicate_of: null, severity: "blocker" };
    writeFileSync("verdict.json", JSON.stringify(v));
  } else if (prompt.includes("YOUR AREA: Booking")) {
    writeFileSync("findings.json", JSON.stringify({ summary: "looked", checked: ["a"], could_not_check: [], findings: [
      { category: "defect", severity: "before", title: "REAL thing", files: ["audit-store.mjs:10-12"] },
      { category: "defect", severity: "before", title: "INVENTED lines", files: ["audit-store.mjs:99999", "nope.ts:5"] },
      { category: "defect", severity: "after", title: "DUP of roadmap", files: ["audit-store.mjs:1"] },
      { category: "defect", severity: "after", title: "FALSE alarm", files: ["audit-store.mjs:2"] },
      { category: "opportunity", severity: "idea", title: "An idea", files: [] },
    ] }));
  } // Money: hands in nothing, to prove retry-then-shelve
  console.log(JSON.stringify({ type: "result", subtype: "success", is_error: false, result: "DONE", session_id: "fake", total_cost_usd: 0.01,
    usage: { input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } }));
});
