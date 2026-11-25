// A stand-in for ChatGPT's codex CLI (node codex.js exec …), for the Studio looks tests. It spends no usage.
// It answers from STUDIO_FAKE_CODEX (a JSON file):
//   { "critics": [answer, answer, …], "replies": { "<REQUEST line>": { "text": "…" } } }
// A critic call (the prompt names the screenshots) gets critics[i], i counting up in STUDIO_FAKE_CODEX_COUNT (a file),
// so three looks get three answers in order. A maker call (prompt on stdin) gets the reply for its REQUEST line.
// An answer that is a string is written as is (to test a malformed one); { "limited": "words" } plays out of usage.
//   STUDIO_FAKE_CODEX_LOG  append { args, critic } per call
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
const args = process.argv.slice(2);
const at = (k) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const answerFile = at("--output-last-message") || at("-o");
// the critic's prompt is an argument (before its --image list: codex reads every value after --image as an image);
// a maker's prompt comes on stdin ("-")
const prompt = args.find((a) => /Judge ONLY supplied screenshots/.test(a)) ?? (args.includes("-") ? readFileSync(0, "utf8") : "");
const critic = /Judge ONLY supplied screenshots/.test(prompt);
const data = JSON.parse(readFileSync(process.env.STUDIO_FAKE_CODEX, "utf8"));
if (process.env.STUDIO_FAKE_CODEX_LOG) appendFileSync(process.env.STUDIO_FAKE_CODEX_LOG, JSON.stringify({ pid: process.pid, args, critic, images: args.filter((a, i) => args[i - 1] === "--image") }) + "\n");
let r;
if (critic) {
  const f = process.env.STUDIO_FAKE_CODEX_COUNT; let i = 0;
  if (f) { try { i = Number(readFileSync(f, "utf8")) || 0; } catch {} writeFileSync(f, String(i + 1)); }
  r = data.critics[Math.min(i, data.critics.length - 1)];
} else {
  const req = /^REQUEST: (.*)$/m.exec(prompt)?.[1]?.trim();
  const rep = data.replies?.[req];
  if (rep?.delayMs) await new Promise((ok) => setTimeout(ok, rep.delayMs));
  r = rep?.text ?? null;
  if (r == null) { process.stderr.write(`no recording for ${JSON.stringify(req)}\n`); process.exit(1); }
}
if (r && typeof r === "object" && r.limited) { process.stderr.write(r.limited + "\n"); process.exit(1); }
writeFileSync(answerFile, typeof r === "string" ? r : JSON.stringify(r));
process.stdout.write("done\n");
