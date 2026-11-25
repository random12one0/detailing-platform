// A stand-in for the Claude CLI, for the Studio AI tests (studio-ai.test.mjs, studio-editor.test.mjs). It spends no
// usage: it reads the request from the prompt on stdin and answers with the RECORDED reply for it
// (studio-ai-replies.json, recorded from the real interpreter), in Claude Code's own --output-format json shape.
//   STUDIO_FAKE_REPLIES  another replies file
//   STUDIO_FAKE_LOG      append {args, system, prompt} for each call, as one JSON line (to check what was sent)
// A reply entry is { text } or { text, delayMs } or { limited: "the CLI's own words" } or { crash: "stderr words" }.
// A request with no recorded reply gets a plain "no recording" error, so a test can never pass on an invented answer.
import { appendFileSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const prompt = readFileSync(0, "utf8");
const args = process.argv.slice(2);
const at = args.indexOf("--system-prompt-file");
const sysFile = at >= 0 ? args[at + 1]?.replace(/^"|"$/g, "") : null;
let system = ""; try { system = sysFile ? readFileSync(sysFile, "utf8") : ""; } catch {}
if (process.env.STUDIO_FAKE_LOG) appendFileSync(process.env.STUDIO_FAKE_LOG, JSON.stringify({ args, system, prompt }) + "\n");
const replies = JSON.parse(readFileSync(process.env.STUDIO_FAKE_REPLIES || path.join(HERE, "studio-ai-replies.json"), "utf8")).replies;
const request = /^REQUEST: (.*)$/m.exec(prompt)?.[1]?.trim() ?? "";
const r = replies[request];
const say = (o) => process.stdout.write(JSON.stringify({ type: "result", subtype: "success", total_cost_usd: 0, session_id: "fake", ...o }) + "\n");
if (!r) { say({ is_error: true, result: `no recording for ${JSON.stringify(request)}` }); process.exit(1); }
if (r.delayMs) await new Promise((ok) => setTimeout(ok, r.delayMs));
if (r.limited) { say({ is_error: true, result: r.limited }); process.exit(1); }
if (r.crash) { process.stderr.write(r.crash + "\n"); process.exit(3); }
say({ is_error: false, result: r.text });
