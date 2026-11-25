// Live proof (spends a little usage): one real chat-edit request through the engine named on the command line.
//   node studio-ai-engine-proof.mjs claude|codex|auto
// Prints the engine's raw answer, then readReply's verdict (the same strict reader the Studio uses).
import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdtempSync, writeFileSync } from "node:fs";
import os from "node:os";
import { loadPack, buildPrompt, readReply, runAI, pickEngine } from "./studio-ai.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SPEC = { schema: 1, pages: [{ path: "/", sections: [
  { id: "hero", type: "hero", copy: { eyebrow: "Neighborhood auto care", headline: "Care you can see.", sub: "Every price below comes from our booking system." }, photo: { bind: "gallery:1" }, cta: { bind: "book" } },
  { id: "menu", type: "catalog", copy: { title: "The menu" }, group: { bind: "service_group:2" } }] }] };
const TYPES = { hero: { copy: ["eyebrow", "headline", "sub"], slots: ["photo", "prices", "cta", "call", "area", "sale"] }, catalog: { copy: ["title", "intro"], slots: ["group", "add_ons", "plans", "sale"] } };
const engine = process.argv[2] || "auto";
const pack = loadPack(path.join(HERE, "studio/knowledge"));
const systemFile = path.join(mkdtempSync(path.join(os.tmpdir(), "proof-")), "pack.md");
writeFileSync(systemFile, pack.text);
const prompt = buildPrompt({ business: "Brightline", spec: SPEC, types: TYPES, target: { section: "hero", field: "headline" }, request: "Make the headline shorter and friendlier." });
console.log("engine picked:", pickEngine(engine));
const r = await runAI({ engine, codexModel: "gpt-6.1-sol", model: "sonnet", effort: "low", systemFile, session: "6f1c0b9e-2d7a-4c1e-9a77-1b2c3d4e5f60", prompt, ms: 240000, kill: (pid) => { try { process.kill(pid); } catch {} } });
console.log("raw:", JSON.stringify(r).slice(0, 700));
if (r.ok) { const v = readReply(r.text, SPEC, TYPES); console.log("readReply:", JSON.stringify(v)); process.exit(v.ok ? 0 : 1); }
process.exit(1);
