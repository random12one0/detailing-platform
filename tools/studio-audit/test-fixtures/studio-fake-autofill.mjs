// A stand-in for the Claude CLI for the website-autofill test (studio-hosted.test.mjs): spends no usage, answers with
// the JSON in STUDIO_FAKE_AUTOFILL (a file), in Claude Code's --output-format json shape, and logs the prompt to
// STUDIO_FAKE_LOG so the test can check what Claude was shown.
import { appendFileSync, readFileSync } from "node:fs";
const prompt = readFileSync(0, "utf8");
if (process.env.STUDIO_FAKE_LOG) appendFileSync(process.env.STUDIO_FAKE_LOG, JSON.stringify({ args: process.argv.slice(2), prompt }) + "\n");
const out = JSON.parse(readFileSync(process.env.STUDIO_FAKE_AUTOFILL, "utf8"));
process.stdout.write(JSON.stringify({ type: "result", subtype: "success", is_error: false, total_cost_usd: 0, result: "", structured_output: out }) + "\n");
